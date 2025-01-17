const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getAvailability } = require('../controllers/calender.controller');
router.get('/availability', authMiddleware, getAvailability);
module.exports = router;