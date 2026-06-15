const mongoose = require('mongoose');
const { Schema } = mongoose;

const FlagSchema = new Schema({
  messageId: { type: Schema.Types.ObjectId, ref: 'Message', required: true },
  flaggedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Flag', FlagSchema);
