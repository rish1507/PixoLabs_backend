const express = require('express');
const router = express.Router();
const { 
    initialize, 
    handleInteractive, 
    sendMessage, 
    getChannelInfo 
} = require('../controllers/slack.controller');
const { authMiddleware } = require("../middleware/auth");

// Initialize Slack client with credentials
router.use((req,res,next)=>{
     console.log('in slack route');
     console.log('URL:', req.url); 
     console.log('Full URL:', req.originalUrl);  
     next();
})
router.post('/initialize', authMiddleware,initialize);

// Handle all Slack interactive components
router.post('/interactive-endpoint', handleInteractive);

// Send message to Slack channel
router.post('/send-message', sendMessage);



module.exports = router;