const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  subject: String,
  content: {
    type: String,
    required: true
  },
  tags: [String],
  usageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);
module.exports = EmailTemplate;