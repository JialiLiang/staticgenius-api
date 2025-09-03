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
const generateAdHandler = require('./generateAd.js');
const photoroomHandler = require('./photoroom.js');
const textRemovalHandler = require('./textRemoval.js');
const imageTranslationHandler = require('./imageTranslation.js');
const adminHandler = require('./admin.js');

// Import middleware
const { authenticateApiKey, addRateLimitHeaders } = require('./middleware/auth');

// Apply authentication and rate limiting to API routes
app.use('/api', authenticateApiKey);
app.use('/api', addRateLimitHeaders);

// Routes
app.all('/api/generate', generateHandler);  // Support both GET and POST
app.all('/api/generate-ad', generateAdHandler);  // New high-level ad generation endpoint
app.post('/api/photoroom', photoroomHandler);
app.post('/api/remove-text', textRemovalHandler);
app.post('/api/translate', imageTranslationHandler);
app.post('/api/gpt-resize', require('./gptResize.js')); // New GPT-4 Vision resize endpoint

// Admin routes (no rate limiting)
app.all('/admin', adminHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'StaticGenius API Server',
    version: '1.0.0',
    endpoints: ['/api/generate', '/api/generate-ad', '/api/photoroom', '/api/remove-text', '/api/translate', '/api/gpt-resize', '/health', '/admin'],
    documentation: 'https://github.com/your-repo/StaticGeniusPro/blob/main/API_DOCUMENTATION.md',
    authentication: 'Bearer token required for API endpoints (optional in development)',
    rateLimit: 'Varies by tier: free (10/min), pro (50/min), enterprise (200/min)'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 REPLICATE_API_TOKEN present: ${!!process.env.REPLICATE_API_TOKEN}`);
  console.log(`🔑 OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`🔑 PHOTOROOM_API_KEY present: ${!!process.env.PHOTOROOM_API_KEY}`);
  console.log(`🎯 GPT-1 resize endpoint available at /api/gpt-resize`);
}); 