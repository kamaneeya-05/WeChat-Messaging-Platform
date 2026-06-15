"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Chat_1 = __importDefault(require("../models/Chat"));
const Message_1 = __importDefault(require("../models/Message"));
const Flag_1 = __importDefault(require("../models/Flag"));
const ensureCollections = async () => {
    const models = [User_1.default, Chat_1.default, Message_1.default, Flag_1.default];
    for (const model of models) {
        try {
            await model.createCollection();
            console.log(`Collection ready: ${model.collection.name}`);
        }
        catch (error) {
            // Ignore "already exists" race and continue boot.
            const message = error instanceof Error ? error.message : String(error);
            if (!message.toLowerCase().includes('already exists')) {
                throw error;
            }
        }
    }
};
const connectDB = async () => {
    try {
        // We will use a fallback string for local development if the .env isn't set
        const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/realtime_chat';
        await mongoose_1.default.connect(mongoURI);
        const { host, port, name } = mongoose_1.default.connection;
        console.log(`MongoDB connected successfully: ${host}:${port}/${name}`);
        await ensureCollections();
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};
exports.default = connectDB;
