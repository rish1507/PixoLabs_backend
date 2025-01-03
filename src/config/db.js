const mongoose = require('mongoose');
const config = require('./config');

exports.connectDB = async () => {
  try {
    await mongoose.connect(config.mongodb.uri, {
      
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};