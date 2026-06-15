const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChatSchema = new Schema({
  type: { type: String, enum: ['1:1', 'group', 'support'], required: true },
  chatName: { type: String, trim: true },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  groupAdmins: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Chat', ChatSchema);
