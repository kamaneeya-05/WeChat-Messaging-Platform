"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// Configure Multer for profile picture upload
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for profile pictures
});
// Protect this route so only logged-in users can search
router.get('/', authMiddleware_1.protectRoute, userController_1.searchUsers);
// Get current user's profile
router.get('/profile/me', authMiddleware_1.protectRoute, userController_1.getProfile);
// Update profile picture
router.post('/profile/picture', authMiddleware_1.protectRoute, upload.single('profilePicture'), userController_1.updateProfilePicture);
// Delete profile picture
router.delete('/profile/picture', authMiddleware_1.protectRoute, userController_1.deleteProfilePicture);
exports.default = router;
