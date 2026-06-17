const mongoose = require('mongoose');
const { Schema } = mongoose;

const CallHistorySchema = new Schema({
  callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  callType: { type: String, enum: ['voice', 'video', 'group'], required: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  duration: { type: Number, default: 0 }, // seconds
  status: { type: String, enum: ['missed', 'completed', 'rejected', 'failed', 'cancelled', 'ringing', 'in-progress'], default: 'ringing' },
  roomId: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CallHistory', CallHistorySchema);
