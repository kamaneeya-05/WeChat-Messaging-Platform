const CallHistory = require('../models/CallHistory');
const User = require('../models/User');

// Track active socket connections per user (supports multiple tabs)
const userSockets = new Map();

function isUserOnline(io, userId) {
  const room = io.sockets.adapter.rooms.get(String(userId));
  return room && room.size > 0;
}

function broadcastStatus(io, userId, status) {
  io.emit('user-status-changed', { userId: String(userId), status });
}

const configureSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    socket.on('setup', async (userId) => {
      const uid = String(userId);
      socket.join(uid);
      socket.userId = uid;

      if (!userSockets.has(uid)) userSockets.set(uid, new Set());
      const wasOffline = userSockets.get(uid).size === 0;
      userSockets.get(uid).add(socket.id);

      try {
        await User.findByIdAndUpdate(uid, { status: 'online' });
      } catch (err) {
        console.error('Error updating user status:', err);
      }

      if (wasOffline) {
        broadcastStatus(io, uid, 'online');
      }

      // Send currently-online users to the newly connected client
      const onlineUserIds = Array.from(userSockets.keys()).filter((id) => id !== uid);
      socket.emit('online-users', { userIds: onlineUserIds });

      socket.emit('connected');
      console.log(`User ${uid} is online and setup.`);
    });

    socket.on('join chat', (chatId) => {
      socket.join(chatId);
    });

    socket.on('new message', (newMessage) => {
      const chatId = newMessage.chatId;
      socket.to(chatId).emit('message received', newMessage);
    });

    socket.on('messages read', ({ chatId, readerId }) => {
      socket.to(chatId).emit('messages read', { chatId, readerId });
    });

    socket.on('leave chat', (chatId) => {
      socket.leave(chatId);
    });

    socket.on('set-status', async ({ status }) => {
      if (!socket.userId || !status) return;
      try {
        await User.findByIdAndUpdate(socket.userId, { status });
        broadcastStatus(io, socket.userId, status);
      } catch (err) {
        console.error('set-status error', err);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      if (socket.userId) {
        const uid = socket.userId;
        const sockets = userSockets.get(uid);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(uid);
            try {
              await User.findByIdAndUpdate(uid, { status: 'offline' });
            } catch (err) {
              console.error('Error updating user status on disconnect:', err);
            }
            broadcastStatus(io, uid, 'offline');
          }
        }
      }
    });

    // ------------------ Signaling / Calling Events ------------------
    socket.on('call-user', async (payload) => {
      try {
        const { toUserId, fromUser, callType, roomId } = payload;
        const targetId = String(toUserId);

        // Real-time presence check via socket rooms (not stale DB status)
        if (!isUserOnline(io, targetId)) {
          socket.emit('call-error', { message: 'User is offline' });
          return;
        }

        const call = await CallHistory.create({
          callerId: fromUser._id || fromUser.id,
          receiverId: targetId,
          callType: callType || 'voice',
          roomId: roomId || undefined,
          status: 'ringing',
        });

        socket.data = socket.data || {};
        socket.data.activeCallId = call._id;

        console.log(`Calling user ${targetId} from ${fromUser._id || fromUser.id}`);

        // Notify callee
        io.to(targetId).emit('incoming-call', {
          from: fromUser,
          callType: callType || 'voice',
          roomId,
          callId: call._id,
        });

        // Acknowledge caller with callId
        socket.emit('call-initiated', { callId: call._id, toUserId: targetId });
      } catch (err) {
        console.error('call-user error', err);
        socket.emit('call-error', { message: 'Failed to initiate call' });
      }
    });

    socket.on('call-accepted', async ({ toUserId, fromUser, callId }) => {
      try {
        io.to(String(toUserId)).emit('call-accepted', { from: fromUser, callId });
        if (callId) {
          await CallHistory.findByIdAndUpdate(callId, {
            status: 'in-progress',
            startedAt: new Date(),
          });
        }
      } catch (err) {
        console.error('call-accepted error', err);
      }
    });

    socket.on('call-rejected', async ({ toUserId, fromUser, callId, reason }) => {
      try {
        io.to(String(toUserId)).emit('call-rejected', { from: fromUser, callId, reason });
        if (callId) {
          await CallHistory.findByIdAndUpdate(callId, { status: 'rejected', endedAt: new Date() });
        }
      } catch (err) {
        console.error('call-rejected error', err);
      }
    });

    socket.on('offer', ({ toUserId, fromUser, offer, callId, callType }) => {
      io.to(String(toUserId)).emit('offer', { from: fromUser, offer, callId, callType });
    });

    socket.on('answer', ({ toUserId, fromUser, answer, callId }) => {
      io.to(String(toUserId)).emit('answer', { from: fromUser, answer, callId });
    });

    socket.on('ice-candidate', ({ toUserId, candidate, callId }) => {
      io.to(String(toUserId)).emit('ice-candidate', { candidate, callId });
    });

    socket.on('end-call', async ({ toUserId, fromUser, callId, reason }) => {
      try {
        io.to(String(toUserId)).emit('end-call', { from: fromUser, callId, reason });
        if (callId) {
          const call = await CallHistory.findById(callId);
          if (call) {
            const endedAt = new Date();
            call.endedAt = endedAt;
            if (call.startedAt) {
              call.duration = Math.max(0, Math.floor((endedAt - call.startedAt) / 1000));
              call.status = 'completed';
            } else {
              call.status = reason === 'missed' ? 'missed' : 'cancelled';
            }
            await call.save();
          }
        }
      } catch (err) {
        console.error('end-call error', err);
      }
    });

    socket.on('join-call-room', ({ roomId }) => {
      if (roomId) socket.join(roomId);
    });

    socket.on('leave-call-room', ({ roomId }) => {
      if (roomId) socket.leave(roomId);
    });

    socket.on('message deleted', (deletedMessage) => {
      socket.to(deletedMessage.chatId).emit('message deleted', deletedMessage);
    });

    socket.on('user kicked', ({ chatId, removedUserId }) => {
      socket.to(chatId).emit('user kicked', { chatId, removedUserId });
    });
  });
};

module.exports = { configureSockets };
