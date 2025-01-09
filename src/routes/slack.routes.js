const express = require('express');
const router = express.Router();
const { 
    initialize, 
    handleInteractive, 
    sendMessage, 
    getChannelInfo 
} = require('../controllers/slack.controller');

// Initialize Slack client with credentials
router.post('/initialize', initialize);

// Handle all Slack interactive components
router.post('/interactive', handleInteractive);

// Send message to Slack channel
router.post('/send-message', sendMessage);

// Get channel information
router.get('/channel-info', getChannelInfo);

module.exports = router;