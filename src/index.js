// src/index.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const routes = require('./routes');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  origin:'https://www.pixolabs.com',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();