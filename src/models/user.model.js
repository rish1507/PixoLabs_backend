const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {  // Add this field
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  tokens: {
    access_token: String,
    refresh_token: String,
    expiry_date: Number
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  slackInitialized: { // New field
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add method to check if tokens are expired
userSchema.methods.areTokensExpired = function() {
  if (!this.tokens?.expiry_date) return true;
  return Date.now() >= this.tokens.expiry_date;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
