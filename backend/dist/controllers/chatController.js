"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFromGroup = exports.getUserChats = exports.createGroupChat = exports.createOrFetchChat = void 0;
const Chat_1 = __importDefault(require("../models/Chat"));
const Message_1 = __importDefault(require("../models/Message"));
// Initialize a new chat or fetch an existing 1:1 chat
const createOrFetchChat = async (req, res) => {
    try {
        const { participantId, isGroup, chatName } = req.body;
        const currentUserId = req.user?.userId;
        if (!currentUserId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        // Logic for 1:1 Chat
        if (!isGroup) {
            // Check if a 1:1 chat already exists between these two users
            const existingChat = await Chat_1.default.findOne({
                type: '1:1',
                participants: { $all: [currentUserId, participantId] }
            }).populate('participants', 'username email status'); // Populate user details, exclude password
            if (existingChat) {
                res.status(200).json(existingChat);
                return;
            }
            // If not, create a new 1:1 chat
            const newChat = new Chat_1.default({
                type: '1:1',
                participants: [currentUserId, participantId]
            });
            await newChat.save();
            const populatedChat = await newChat.populate('participants', 'username email status');
            res.status(201).json(populatedChat);
            return;
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating or fetching chat', error });
    }
};
exports.createOrFetchChat = createOrFetchChat;
const createGroupChat = async (req, res) => {
    try {
        // Expecting the frontend to send a group name and an array of user IDs
        const { chatName, users } = req.body;
        const currentUserId = req.user?.userId;
        // 1. Validation
        if (!chatName || !users || users.length === 0) {
            res.status(400).json({ message: 'Please provide a chat name and at least one other user to add.' });
            return;
        }
        // 2. Add the creator to the participants list
        // (Ensure users is an array of IDs from the frontend)
        const participants = [...users, currentUserId];
        // 3. Create the Group Chat document
        const groupChat = new Chat_1.default({
            type: 'group',
            chatName: chatName,
            participants: participants,
            groupAdmins: [currentUserId] // The person who creates it is automatically the admin
        });
        await groupChat.save();
        // 4. Fetch the newly created chat and populate the user details so the frontend has avatars/names instantly
        const fullGroupChat = await Chat_1.default.findById(groupChat._id)
            .populate('participants', 'username email status') // Exclude passwords
            .populate('groupAdmins', 'username email');
        res.status(201).json(fullGroupChat);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error creating group chat', error });
    }
};
exports.createGroupChat = createGroupChat;
// Get all chats for the logged-in user
const getUserChats = async (req, res) => {
    try {
        const currentUserId = req.user?.userId;
        // 1. ADD THIS CHECK
        if (!currentUserId) {
            res.status(401).json({ message: 'Unauthorized: User ID is missing' });
            return;
        }
        // 2. TypeScript now knows currentUserId is definitely a string!
        const chats = await Chat_1.default.find({
            participants: { $in: [currentUserId] }
        })
            .populate('participants', 'username email status')
            .sort({ updatedAt: -1 }); // Most recently active chats first
        const enrichedChats = await Promise.all(chats.map(async (chat) => {
            const [lastMessage, unreadCount] = await Promise.all([
                Message_1.default.findOne({ chatId: chat._id }).sort({ timestamp: -1 }).lean(),
                Message_1.default.countDocuments({
                    chatId: chat._id,
                    senderId: { $ne: currentUserId },
                    status: { $ne: 'read' },
                }),
            ]);
            return {
                ...chat.toObject(),
                lastMessage: lastMessage?.content || '',
                lastMessageTime: lastMessage?.timestamp || null,
                unreadCount,
            };
        }));
        res.status(200).json(enrichedChats);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error fetching chats', error });
    }
};
exports.getUserChats = getUserChats;
const removeFromGroup = async (req, res) => {
    try {
        const { chatId, userIdToRemove } = req.body;
        const currentUserId = req.user?.userId;
        const chat = await Chat_1.default.findById(chatId);
        if (!chat || chat.type !== 'group') {
            res.status(404).json({ message: 'Group chat not found' });
            return;
        }
        // Verify the requester is an admin
        if (!chat.groupAdmins.includes(currentUserId)) {
            res.status(403).json({ message: 'Only admins can remove members' });
            return;
        }
        // Remove the user
        const updatedChat = await Chat_1.default.findByIdAndUpdate(chatId, { $pull: { participants: userIdToRemove, groupAdmins: userIdToRemove } }, { new: true })
            .populate('participants', '-password')
            .populate('groupAdmins', '-password');
        res.status(200).json(updatedChat);
    }
    catch (error) {
        res.status(500).json({ message: 'Error removing user from group' });
    }
};
exports.removeFromGroup = removeFromGroup;
