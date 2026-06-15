"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSockets = void 0;
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
exports.configureSockets = configureSockets;
