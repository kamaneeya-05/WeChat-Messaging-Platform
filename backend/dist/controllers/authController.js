"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key';
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        // Hash the password
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Create and save the new user
        const newUser = new User_1.default({
            username,
            email,
            password: hashedPassword,
            status: 'offline'
        });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error during registration', error });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find the user
        const user = await User_1.default.findOne({ email });
        if (!user || !user.password) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }
        // Validate password
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }
        // Generate JWT [cite: 87, 166]
        const token = jsonwebtoken_1.default.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        // Update status to online (Optional: you might want to handle this via Socket.io instead)
        user.status = 'online';
        await user.save();
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                status: user.status
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error during login', error });
    }
};
exports.login = login;
const logout = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        await User_1.default.findByIdAndUpdate(userId, { status: 'offline' });
        res.status(200).json({ message: 'Logged out successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error during logout', error });
    }
};
exports.logout = logout;
