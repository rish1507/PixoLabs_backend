const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messageId: {
    type: String,
    required: true
  },
  threadId: {
    type: String,
    required: true
  },
  subject: String,
  from: String,
  to: String,
  content: String,
  generatedContent: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'approved', 'rejected'],
    default: 'draft'
  }
}, {
  timestamps: true
});

const Email = mongoose.model('Email', emailSchema);
module.exports = Email;