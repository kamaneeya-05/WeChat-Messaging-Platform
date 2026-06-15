const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 1. Removed 'required: true'. Default is an empty string if they only send a file.
  content: { type: String, default: '' }, 
  
  // 2. The Media Fields
  mediaUrl: { type: String },
  mediaType: { type: String, enum: ['image', 'video', 'document', 'audio'] },
  mediaName: { type: String }, // Stores the original file name
  
  status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  isDeleted: { type: Boolean, default: false }
}, { 
  timestamps: { createdAt: 'timestamp', updatedAt: false } 
});

module.exports = mongoose.model('Message', MessageSchema);
