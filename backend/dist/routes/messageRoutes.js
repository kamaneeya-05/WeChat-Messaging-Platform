"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const messageController_1 = require("../controllers/messageController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// 1. Configure Multer to hold the file in memory
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});
// 2. Add upload.single('media') to the route!
router.post('/media', authMiddleware_1.protectRoute, upload.single('media'), messageController_1.sendMessageWithMedia);
// Your existing routes
router.post('/', authMiddleware_1.protectRoute, messageController_1.sendMessage);
router.get('/:chatId', authMiddleware_1.protectRoute, messageController_1.getMessages);
router.patch('/read/:chatId', authMiddleware_1.protectRoute, messageController_1.markChatMessagesAsRead);
router.delete('/:messageId', authMiddleware_1.protectRoute, messageController_1.deleteMessage);
exports.default = router;
