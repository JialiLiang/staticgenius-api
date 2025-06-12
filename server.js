const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://static-genius-pro.vercel.app', 'https://staticgeniuspro.vercel.app'],
  credentials: true
}));
app.use(express.json());

// Import route handlers
const generateHandler = require('./generate.js');
const testHandler = require('./test.js');
const helloHandler = require('./hello.js');

// Routes
app.post('/api/generate', generateHandler);
app.get('/api/test', testHandler);
app.get('/api/hello', helloHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'StaticGenius API Server',
    endpoints: ['/api/generate', '/api/test', '/api/hello', '/health']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 