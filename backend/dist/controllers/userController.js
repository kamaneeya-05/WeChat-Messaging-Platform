"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProfilePicture = exports.updateProfilePicture = exports.getProfile = exports.searchUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const searchUsers = async (req, res) => {
    try {
        const searchQuery = req.query.search || '';
        const currentUserId = req.user?.userId;
        if (!searchQuery) {
            res.status(400).json({ message: 'Please provide a search term' });
            return;
        }
        const keyword = {
            $or: [
                { email: { $regex: searchQuery, $options: 'i' } },
                { username: { $regex: searchQuery, $options: 'i' } },
            ],
        };
        const users = await User_1.default.find(keyword)
            .find({ _id: { $ne: currentUserId } })
            .select('-password')
            .limit(10);
        res.status(200).json(users);
    }
    catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: 'Server error searching for users' });
    }
};
exports.searchUsers = searchUsers;
// --- NEW: Get current user's profile
const getProfile = async (req, res) => {
    try {
        const currentUserId = req.user?.userId;
        if (!currentUserId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await User_1.default.findById(currentUserId).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.status(200).json(user);
    }
    catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};
exports.getProfile = getProfile;
// --- NEW: Update profile picture
const updateProfilePicture = async (req, res) => {
    try {
        const currentUserId = req.user?.userId;
        const file = req.file;
        if (!currentUserId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!file) {
            res.status(400).json({ message: 'No file provided' });
            return;
        }
        // Get current user to delete old profile picture
        const user = await User_1.default.findById(currentUserId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Delete old profile picture from local storage if exists
        if (user.profilePicture) {
            try {
                const oldFilePath = path_1.default.join(__dirname, '../../uploads', user.profilePicture.replace('/uploads/', ''));
                if (fs_1.default.existsSync(oldFilePath)) {
                    fs_1.default.unlinkSync(oldFilePath);
                }
            }
            catch (err) {
                console.log("Could not delete old profile picture");
            }
        }
        // Save new profile picture locally
        const fileExtension = path_1.default.extname(file.originalname);
        const uniqueFilename = `${(0, uuid_1.v4)()}${fileExtension}`;
        const filePath = path_1.default.join(__dirname, '../../uploads/profile_pictures', uniqueFilename);
        // Ensure directory exists
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        // Write file to disk
        fs_1.default.writeFileSync(filePath, file.buffer);
        // Update user with new profile picture URL
        user.profilePicture = `/uploads/profile_pictures/${uniqueFilename}`;
        await user.save();
        res.status(200).json({
            message: 'Profile picture updated successfully',
            profilePicture: user.profilePicture,
            user: user
        });
    }
    catch (error) {
        console.error("Profile picture upload error:", error);
        res.status(500).json({ message: 'Server error updating profile picture' });
    }
};
exports.updateProfilePicture = updateProfilePicture;
// --- NEW: Delete profile picture
const deleteProfilePicture = async (req, res) => {
    try {
        const currentUserId = req.user?.userId;
        if (!currentUserId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const user = await User_1.default.findById(currentUserId);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        if (user.profilePicture) {
            try {
                const oldFilePath = path_1.default.join(__dirname, '../../uploads', user.profilePicture.replace('/uploads/', ''));
                if (fs_1.default.existsSync(oldFilePath)) {
                    fs_1.default.unlinkSync(oldFilePath);
                }
            }
            catch (err) {
                console.log("Could not delete profile picture from local storage");
            }
        }
        user.profilePicture = undefined;
        await user.save();
        res.status(200).json({
            message: 'Profile picture deleted successfully',
            user: user
        });
    }
    catch (error) {
        console.error("Profile picture delete error:", error);
        res.status(500).json({ message: 'Server error deleting profile picture' });
    }
};
exports.deleteProfilePicture = deleteProfilePicture;
