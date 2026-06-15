const Message = require('../models/Message');
const Chat = require('../models/Chat');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Verify the chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404).json({ message: 'Chat not found' });
      return;
    }

    // Fetch all messages for this chat - include profile picture in sender data
    const messages = await Message.find({ chatId })
      .populate('senderId', 'username profilePicture status')
      .sort({ timestamp: 1 }); // Oldest to newest for chat UI flow

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching messages', error });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content, chatId } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId || !content || !chatId) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // Create and save the message
    const newMessage = new Message({
      chatId,
      senderId: currentUserId,
      content,
      status: 'sent'
    });

    await newMessage.save();

    // Update the chat's updatedAt timestamp to bring it to the top of the chat list
    await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

    // Populate sender details including profile picture before returning
    const populatedMessage = await newMessage.populate('senderId', 'username profilePicture status');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error sending message', error });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user?.userId;

    const message = await Message.findById(messageId).populate('chatId');

    if (!message) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    const chat = message.chatId;

    // Check permissions: Sender can delete their own, or Group Admin can delete any
    const isSender = message.senderId.toString() === currentUserId;
    const isAdmin = chat.type === 'group' && chat.groupAdmins.includes(currentUserId);

    if (!isSender && !isAdmin) {
      res.status(403).json({ message: 'Not authorized to delete this message' });
      return;
    }

    // Soft delete to maintain the "This message was deleted" UI
    message.isDeleted = true;
    message.content = "This message was deleted";
    message.mediaUrl = undefined; // Scrub any media
    
    await message.save();

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message' });
  }
};

// --- THE NEW MEDIA FUNCTION ---
const sendMessageWithMedia = async (req, res) => {
  try {
    const { content, chatId } = req.body;
    const currentUserId = req.user?.userId; 

    if (!chatId) {
      res.status(400).json({ message: 'Invalid data passed into request' });
      return;
    }

    let mediaUrl = undefined;
    let mediaType = null;
    let mediaName = undefined;

    // If a file exists, save locally
    if (req.file) {
      // Generate unique filename to avoid conflicts
      const fileExtension = path.extname(req.file.originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const filePath = path.join(__dirname, '../../uploads/chat_media', uniqueFilename);

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file to disk
      fs.writeFileSync(filePath, req.file.buffer);

      // Create URL path for serving the file
      mediaUrl = `/uploads/chat_media/${uniqueFilename}`;
      mediaName = req.file.originalname;

      // Determine media type based on mimetype
      if (req.file.mimetype.startsWith('image/')) {
        mediaType = 'image';
      } else if (req.file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else if (req.file.mimetype.startsWith('audio/')) {
        mediaType = 'audio';
      } else {
        mediaType = 'document';
      }
    }

    let newMessage = await Message.create({
      senderId: currentUserId,
      chatId: chatId,
      content: content || '', 
      mediaUrl,
      mediaType,
      mediaName
    });

    newMessage = await newMessage.populate('senderId', 'username profilePicture status');
    newMessage = await newMessage.populate('chatId');

    await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Media upload error:", error);
    res.status(500).json({ message: 'Server error sending media' });
  }
};

const markChatMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user?.userId;

    if (!chatId || !currentUserId) {
      res.status(400).json({ message: 'Invalid request' });
      return;
    }

    await Message.updateMany(
      {
        chatId,
        senderId: { $ne: currentUserId },
        status: { $ne: 'read' },
      },
      {
        $set: { status: 'read' },
      }
    );

    res.status(200).json({ chatId, status: 'read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating read status', error });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  deleteMessage,
  sendMessageWithMedia,
  markChatMessagesAsRead,
};

