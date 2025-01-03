const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config/config');

exports.authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);  // This will now work correctly
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
} catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
}
};