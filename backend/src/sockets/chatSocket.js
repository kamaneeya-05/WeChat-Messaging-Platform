const CallHistory = require('../models/CallHistory');

const configureSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // 1. User Setup: When a user logs in, they join a personal room using their User ID.
    // This allows us to send them targeted notifications (like a new chat invite).
    socket.on('setup', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} is online and setup.`);
      socket.emit('connected');
    });

    // 2. Join Chat Room: When a user opens a specific chat interface.
    socket.on('join chat', (chatId) => {
      socket.join(chatId);
      console.log(`User joined room: ${chatId}`);
    });

    // 3. Real-time Messaging: When a user sends a message.
    socket.on('new message', (newMessage) => {
      const chatId = newMessage.chatId;

      // Broadcast the message to everyone in that specific chat room
      // `socket.to()` ensures the sender doesn't receive their own message back
      socket.to(chatId).emit('message received', newMessage);
    });

    socket.on('messages read', ({ chatId, readerId }) => {
      socket.to(chatId).emit('messages read', { chatId, readerId });
    });

    // 4. Leave Chat Room: When a user closes the chat.
    socket.on('leave chat', (chatId) => {
      socket.leave(chatId);
      console.log(`User left room: ${chatId}`);
    });

    // 5. Cleanup on disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
    
    // ------------------ Signaling / Calling Events ------------------
    socket.on('call-user', async (payload) => {
      try {
        // payload: { toUserId, fromUser, callType, roomId }
        const { toUserId, fromUser, callType, roomId } = payload;
        // Create call record (status: ringing)
        const call = await CallHistory.create({
          callerId: fromUser._id || fromUser.id,
          receiverId: toUserId,
          callType: callType || 'voice',
          roomId: roomId || undefined,
          status: 'ringing'
        });
        // Store call id on socket for quick lookup
        socket.data = socket.data || {};
        socket.data.activeCallId = call._id;

        io.to(toUserId).emit('incoming-call', { from: fromUser, callType, roomId, callId: call._id });
      } catch (err) {
        console.error('call-user error', err);
      }
    });

    socket.on('call-accepted', async ({ toUserId, fromUser, callId }) => {
      try {
        io.to(toUserId).emit('call-accepted', { from: fromUser, callId });
        if (callId) {
          await CallHistory.findByIdAndUpdate(callId, { status: 'connected', startedAt: new Date() });
        }
      } catch (err) {
        console.error('call-accepted error', err);
      }
    });

    socket.on('call-rejected', async ({ toUserId, fromUser, callId, reason }) => {
      try {
        io.to(toUserId).emit('call-rejected', { from: fromUser, callId, reason });
        if (callId) {
          await CallHistory.findByIdAndUpdate(callId, { status: 'rejected', endedAt: new Date() });
        }
      } catch (err) {
        console.error('call-rejected error', err);
      }
    });

    socket.on('offer', ({ toUserId, fromUser, offer, callId }) => {
      io.to(toUserId).emit('offer', { from: fromUser, offer, callId });
    });

    socket.on('answer', ({ toUserId, fromUser, answer, callId }) => {
      io.to(toUserId).emit('answer', { from: fromUser, answer, callId });
    });

    socket.on('ice-candidate', ({ toUserId, candidate, callId }) => {
      io.to(toUserId).emit('ice-candidate', { candidate, callId });
    });

    socket.on('end-call', async ({ toUserId, fromUser, callId, reason }) => {
      try {
        io.to(toUserId).emit('end-call', { from: fromUser, callId, reason });
        if (callId) {
          const call = await CallHistory.findById(callId);
          if (call && call.startedAt) {
            const endedAt = new Date();
            const duration = Math.max(0, Math.floor((endedAt - call.startedAt) / 1000));
            call.endedAt = endedAt;
            call.duration = duration;
            call.status = reason === 'missed' ? 'missed' : 'completed';
            await call.save();
          } else if (call) {
            call.endedAt = new Date();
            call.status = reason === 'missed' ? 'missed' : 'completed';
            await call.save();
          }
        }
      } catch (err) {
        console.error('end-call error', err);
      }
    });

    // Group call room helpers
    socket.on('join-call-room', ({ roomId, userId }) => {
      if (roomId) socket.join(roomId);
    });

    socket.on('leave-call-room', ({ roomId, userId }) => {
      if (roomId) socket.leave(roomId);
    });
    socket.on('message deleted', (deletedMessage) => {
  // Broadcast to the room so everyone's UI updates to "This message was deleted"
  socket.to(deletedMessage.chatId).emit('message deleted', deletedMessage);
});

socket.on('user kicked', ({ chatId, removedUserId }) => {
  // Notify the room that the roster has changed
  socket.to(chatId).emit('user kicked', { chatId, removedUserId });
});
  });
};

module.exports = { configureSockets };
