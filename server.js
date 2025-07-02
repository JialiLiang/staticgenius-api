const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
    'https://static-genius-pro.vercel.app', 
    'https://staticgeniuspro.vercel.app',
    /.*\.vercel\.app$/,  // Allow all Vercel subdomains
    /^http:\/\/localhost:\d+$/  // Allow any localhost port for development
  ],
  credentials: true
}));

// Increase body size limits for image processing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.raw({ limit: '50mb', type: '*/*' }));

// Import route handlers
const generateHandler = require('./generate.js');
const photoroomHandler = require('./photoroom.js');
const textRemovalHandler = require('./textRemoval.js');
const imageTranslationHandler = require('./imageTranslation.js');

// Routes
app.all('/api/generate', generateHandler);  // Support both GET and POST
app.post('/api/photoroom', photoroomHandler);
app.post('/api/remove-text', textRemovalHandler);
app.post('/api/translate', imageTranslationHandler);
app.post('/api/gpt-resize', require('./gptResize.js')); // New GPT-4 Vision resize endpoint

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'StaticGenius API Server',
    endpoints: ['/api/generate', '/api/photoroom', '/api/remove-text', '/api/translate', '/api/gpt-resize', '/health']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 REPLICATE_API_TOKEN present: ${!!process.env.REPLICATE_API_TOKEN}`);
  console.log(`🔑 OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`🔑 PHOTOROOM_API_KEY present: ${!!process.env.PHOTOROOM_API_KEY}`);
}); 