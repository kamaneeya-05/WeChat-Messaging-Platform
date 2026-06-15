const mongoose = require('mongoose');
const { Schema } = mongoose;

const SupportSessionSchema = new Schema({
  token: { type: String, required: true, unique: true },
  agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  customerName: { type: String, default: null },
  status: { type: String, enum: ['created', 'active', 'ended'], default: 'created' },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', default: null },
  recordingUrl: { type: String, default: null },
  recordingStatus: { type: String, enum: ['none', 'in_progress', 'processing', 'ready'], default: 'none' },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  history: [{
    event: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: null }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('SupportSession', SupportSessionSchema);
