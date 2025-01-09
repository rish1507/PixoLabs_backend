// routes/waitlistRoutes.js
const express = require('express');
const router = express.Router();
const {
  addToWaitlist,
  getWaitlistEntries,
  deleteWaitlistEntry,
  updateWaitlistStatus
} = require('../controllers/waitList.controller');
const { authMiddleware } = require('../middleware/auth'); // If you have auth middleware

// Public route
router.post('/join', addToWaitlist);

// Protected routes (with authentication)
router.get('/entries', authMiddleware, getWaitlistEntries);
router.delete('/:id', authMiddleware, deleteWaitlistEntry);
router.patch('/:id/status', authMiddleware, updateWaitlistStatus);

module.exports = router;