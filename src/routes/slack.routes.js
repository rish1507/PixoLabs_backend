const express = require('express');
const router = express.Router();
const slackController = require('../controllers/slack.controller');

// Initialize Slack client with credentials
router.post('/initialize', slackController.initialize);

// Handle all Slack interactive components
router.post('/interactive', slackController.handleInteractive);

// Send message to Slack channel
router.post('/send-message', slackController.sendMessage);

// Get channel information
router.get('/channel-info', slackController.getChannelInfo);

module.exports = router;