const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: null }, // Store Cloudinary URL
  status: { type: String, enum: ['online', 'away', 'busy', 'offline'], default: 'offline' },
  role: { type: String, enum: ['agent', 'customer', 'admin'], default: 'agent' },
  isTemporary: { type: Boolean, default: false },
  about: { type: String, default: 'Hey there! I am using Whatsup.' }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('User', UserSchema);
