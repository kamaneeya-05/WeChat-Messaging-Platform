const SupportSession = require('../models/SupportSession');
const { recordDisconnect } = require('../controllers/supportController');

// Map of sessionId -> Map of userId -> { socketId, userName, role, disconnectTimer }
const liveSessions = new Map();

// Map of socketId -> { sessionId, userId } for fast disconnect lookup
const socketMap = new Map();

const configureSupportSockets = (io) => {
  io.on('connection', (socket) => {
    
    // 1. Join Support Session
    socket.on('join support call', async ({ sessionId, userId, userName, role }) => {
      socket.join(sessionId);
      console.log(`📞 User ${userName} (${role}) joined support call ${sessionId} with socket ${socket.id}`);

      // Track socket association
      socketMap.set(socket.id, { sessionId, userId });

      if (!liveSessions.has(sessionId)) {
        liveSessions.set(sessionId, new Map());
      }

      const sessionParticipants = liveSessions.get(sessionId);

      // Check if user is reconnecting (had a grace timer running)
      if (sessionParticipants.has(userId)) {
        const participant = sessionParticipants.get(userId);
        if (participant.disconnectTimer) {
          clearTimeout(participant.disconnectTimer);
          console.log(`🔄 User ${userName} reconnected within grace period. Timer cleared.`);
          participant.disconnectTimer = null;
        }
        // Update socket ID
        participant.socketId = socket.id;
        participant.status = 'connected';
      } else {
        // New join
        sessionParticipants.set(userId, {
          socketId: socket.id,
          userName,
          role,
          status: 'connected',
          disconnectTimer: null
        });
      }

      // Log join in MongoDB
      try {
        await SupportSession.findByIdAndUpdate(sessionId, {
          $push: {
            history: {
              event: `${userName} (${role}) joined the call`,
              userId,
              userName,
              timestamp: new Date()
            }
          }
        });
      } catch (err) {
        console.error('Error logging join event:', err);
      }

      // Notify others in room
      socket.to(sessionId).emit('participant-joined', { userId, userName, role });

      // Send the current list of active users to the joining user
      const list = [];
      sessionParticipants.forEach((p, uid) => {
        if (p.status === 'connected') {
          list.push({ userId: uid, userName: p.userName, role: p.role });
        }
      });
      socket.emit('active-participants', list);
    });

    // 2. Stream Video Frame (relayed through server)
    socket.on('stream-video', ({ sessionId, frame }) => {
      const socketData = socketMap.get(socket.id);
      if (socketData) {
        socket.to(sessionId).emit('stream-video', { senderId: socketData.userId, frame });
      }
    });

    // 3. Stream Audio Chunk (relayed through server)
    socket.on('stream-audio', ({ sessionId, audio }) => {
      const socketData = socketMap.get(socket.id);
      if (socketData) {
        socket.to(sessionId).emit('stream-audio', { senderId: socketData.userId, audio });
      }
    });

    // 4. Remote controls toggle (mute/video)
    socket.on('toggle-media', ({ sessionId, type, value }) => {
      const socketData = socketMap.get(socket.id);
      if (socketData) {
        socket.to(sessionId).emit('remote-media-toggle', { senderId: socketData.userId, type, value });
      }
    });

    // 5. Recording state change
    socket.on('toggle-recording', ({ sessionId, isRecording }) => {
      socket.to(sessionId).emit('recording-state-changed', { isRecording });
    });

    // 6. End session by agent or admin
    socket.on('end-support-call', async ({ sessionId }) => {
      console.log(`🔌 Support session ${sessionId} is being ended.`);
      
      // Clean up session in DB
      try {
        await SupportSession.findByIdAndUpdate(sessionId, {
          status: 'ended',
          endedAt: new Date()
        });
      } catch (err) {
        console.error('Error ending support session in DB:', err);
      }

      // Broadcast end signal
      io.to(sessionId).emit('call-ended-by-agent');

      // Clean up map
      liveSessions.delete(sessionId);
    });

    // 7. Manual Leave Call
    socket.on('leave support call', async () => {
      handleDisconnectOrLeave(socket, true);
    });

    // 8. Unexpected socket disconnect
    socket.on('disconnect', () => {
      handleDisconnectOrLeave(socket, false);
    });
  });
};

const handleDisconnectOrLeave = async (socket, isManualLeave) => {
  const socketData = socketMap.get(socket.id);
  if (!socketData) return;

  const { sessionId, userId } = socketData;
  socketMap.delete(socket.id);

  const sessionParticipants = liveSessions.get(sessionId);
  if (!sessionParticipants || !sessionParticipants.has(userId)) return;

  const participant = sessionParticipants.get(userId);
  const userName = participant.userName;

  if (isManualLeave) {
    console.log(`👋 User ${userName} manually left call ${sessionId}`);
    sessionParticipants.delete(userId);
    socket.to(sessionId).emit('participant-left', { userId, userName });

    // Log in DB
    try {
      await SupportSession.findByIdAndUpdate(sessionId, {
        $push: {
          history: {
            event: `${userName} left the call`,
            userId,
            userName,
            timestamp: new Date()
          }
        }
      });
    } catch (err) {
      console.error('Error logging leave event:', err);
    }

    if (sessionParticipants.size === 0) {
      liveSessions.delete(sessionId);
    }
  } else {
    // Unexpected disconnect -> start 15s grace window
    console.log(`⚠️ User ${userName} disconnected unexpectedly. Starting 15s grace window...`);
    participant.status = 'disconnected';
    recordDisconnect(); // Increment disconnects counter for metrics

    participant.disconnectTimer = setTimeout(async () => {
      console.log(`⏰ Grace window expired. User ${userName} has officially left call ${sessionId}.`);
      
      // Verify they are still disconnected (could have reconnected and cleared timer)
      const currentParticipants = liveSessions.get(sessionId);
      if (currentParticipants && currentParticipants.has(userId)) {
        const currentPart = currentParticipants.get(userId);
        if (currentPart.status === 'disconnected') {
          currentParticipants.delete(userId);
          socket.to(sessionId).emit('participant-left', { userId, userName });

          // Log in DB
          try {
            await SupportSession.findByIdAndUpdate(sessionId, {
              $push: {
                history: {
                  event: `${userName} left the call (timeout)`,
                  userId,
                  userName,
                  timestamp: new Date()
                }
              }
            });
          } catch (err) {
            console.error('Error logging timeout event:', err);
          }

          if (currentParticipants.size === 0) {
            liveSessions.delete(sessionId);
          }
        }
      }
    }, 15000); // 15 seconds grace window
  }
};

// Return count of all active participants across all sessions for metrics
const getConnectedParticipantsCount = () => {
  let count = 0;
  liveSessions.forEach((participants) => {
    participants.forEach((p) => {
      if (p.status === 'connected') {
        count++;
      }
    });
  });
  return count;
};

module.exports = {
  configureSupportSockets,
  getConnectedParticipantsCount
};
