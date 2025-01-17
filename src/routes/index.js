// src/routes/index.js
const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const emailRoutes = require('./email.routes');
const aiRoutes = require('./ai.routes');
const slackRoutes=require("./slack.routes")
const waitListRoutes=require("./waitList.routes.js")
const calenderRoutes=require("./calender.routes.js")
router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/ai', aiRoutes);
router.use('/slack', slackRoutes);
router.use('/waitList',waitListRoutes)
router.use('/calendar', calenderRoutes);
module.exports = router;

