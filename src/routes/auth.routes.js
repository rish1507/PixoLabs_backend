const express = require('express');
const router = express.Router();
const { authenticate, callback, logout } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth');

router.get('/gmail', authenticate);
router.get('/gmail/callback', callback);
router.post('/logout', authMiddleware, logout);

module.exports = router;
