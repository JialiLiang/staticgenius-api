const { 
  createApiKey, 
  revokeApiKey, 
  listApiKeys, 
  getApiKeyStats,
  RATE_LIMITS 
} = require('./middleware/auth');

// Simple admin authentication (in production, use proper admin auth)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Admin ')) {
    return res.status(401).json({
      error: 'Admin authentication required',
      message: 'Use Authorization: Admin <password>'
    });
  }
  
  const password = authHeader.replace('Admin ', '');
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: 'Invalid admin password'
    });
  }
  
  next();
}

async function handler(req, res) {
  console.log('\n🔧 === ADMIN ENDPOINT ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  
  // Enable CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'CORS preflight' });
  }

  // Authenticate admin
  authenticateAdmin(req, res, () => {
    try {
      const action = req.query.action || req.body.action;
      
      switch (action) {
        case 'create-key':
          return handleCreateKey(req, res);
        case 'list-keys':
          return handleListKeys(req, res);
        case 'revoke-key':
          return handleRevokeKey(req, res);
        case 'key-stats':
          return handleKeyStats(req, res);
        case 'system-info':
          return handleSystemInfo(req, res);
        default:
          return res.status(400).json({
            error: 'Invalid action',
            availableActions: ['create-key', 'list-keys', 'revoke-key', 'key-stats', 'system-info']
          });
      }
    } catch (error) {
      console.error('❌ Admin endpoint error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });
}

function handleCreateKey(req, res) {
  const { name, tier = 'free' } = req.body;
  
  if (!name) {
    return res.status(400).json({
      error: 'Name is required'
    });
  }
  
  if (!RATE_LIMITS[tier]) {
    return res.status(400).json({
      error: 'Invalid tier',
      availableTiers: Object.keys(RATE_LIMITS)
    });
  }
  
  const apiKey = createApiKey(name, tier);
  
  console.log('✅ Created new API key:', name, tier);
  
  res.status(201).json({
    success: true,
    apiKey,
    name,
    tier,
    limits: RATE_LIMITS[tier],
    message: 'API key created successfully'
  });
}

function handleListKeys(req, res) {
  const keys = listApiKeys();
  
  res.status(200).json({
    success: true,
    keys,
    total: keys.length
  });
}

function handleRevokeKey(req, res) {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({
      error: 'API key is required'
    });
  }
  
  const revoked = revokeApiKey(apiKey);
  
  if (revoked) {
    console.log('✅ Revoked API key:', apiKey.substring(0, 8) + '...');
    res.status(200).json({
      success: true,
      message: 'API key revoked successfully'
    });
  } else {
    res.status(404).json({
      error: 'API key not found'
    });
  }
}

function handleKeyStats(req, res) {
  const { apiKey } = req.query;
  
  if (!apiKey) {
    return res.status(400).json({
      error: 'API key is required'
    });
  }
  
  const stats = getApiKeyStats(apiKey);
  
  if (!stats) {
    return res.status(404).json({
      error: 'API key not found'
    });
  }
  
  res.status(200).json({
    success: true,
    stats
  });
}

function handleSystemInfo(req, res) {
  res.status(200).json({
    success: true,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development'
    },
    api: {
      rateLimits: RATE_LIMITS,
      endpoints: [
        '/api/generate',
        '/api/generate-ad', 
        '/api/photoroom',
        '/api/remove-text',
        '/api/translate',
        '/api/gpt-resize',
        '/health',
        '/admin'
      ]
    }
  });
}

module.exports = handler;
