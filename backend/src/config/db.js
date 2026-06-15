const mongoose = require('mongoose');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Flag = require('../models/Flag');
const SupportSession = require('../models/SupportSession');

const ensureCollections = async () => {
  const models = [User, Chat, Message, Flag, SupportSession];

  for (const model of models) {
    try {
      await model.createCollection();
      console.log(`Collection ready: ${model.collection.name}`);
    } catch (error) {
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
    
    await mongoose.connect(mongoURI);
    const { host, port, name } = mongoose.connection;
    console.log(`MongoDB connected successfully: ${host}:${port}/${name}`);
    await ensureCollections();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
