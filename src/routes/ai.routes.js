const express = require('express');
const router = express.Router();
const { 
  generateEmail, 
  editEmailWithAI 
} = require('../controllers/ai.controller');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.post('/generate', generateEmail);
router.post('/edit', editEmailWithAI);

module.exports = router;