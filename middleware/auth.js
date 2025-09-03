const crypto = require('crypto');

// Simple API key store (in production, use a database)
const API_KEYS = new Map([
  // Default development key
  ['sg_dev_12345', { name: 'Development', tier: 'free', requests: 0, lastUsed: null }],
  // Add more keys as needed
]);

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Rate limit configuration
const RATE_LIMITS = {
  free: {
    perMinute: 10,
    perHour: 100,
    perDay: 1000
  },
  pro: {
    perMinute: 50,
    perHour: 1000,
    perDay: 10000
  },
  enterprise: {
    perMinute: 200,
    perHour: 5000,
    perDay: 50000
  }
};

// Generate a new API key
function generateApiKey(prefix = 'sg') {
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `${prefix}_${randomBytes}`;
}

// Validate API key format
function isValidApiKeyFormat(key) {
  return /^sg_[a-f0-9]{32}$/.test(key);
}

// Get rate limit key for a user
function getRateLimitKey(apiKey, window) {
  const now = new Date();
  let timeWindow;
  
  switch (window) {
    case 'minute':
      timeWindow = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
      break;
    case 'hour':
      timeWindow = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      break;
    case 'day':
      timeWindow = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      break;
    default:
      timeWindow = 'unknown';
  }
  
  return `${apiKey}:${window}:${timeWindow}`;
}

// Check rate limits
function checkRateLimit(apiKey, tier) {
  const limits = RATE_LIMITS[tier] || RATE_LIMITS.free;
  
  const minuteKey = getRateLimitKey(apiKey, 'minute');
  const hourKey = getRateLimitKey(apiKey, 'hour');
  const dayKey = getRateLimitKey(apiKey, 'day');
  
  const minuteCount = rateLimitStore.get(minuteKey) || 0;
  const hourCount = rateLimitStore.get(hourKey) || 0;
  const dayCount = rateLimitStore.get(dayKey) || 0;
  
  if (minuteCount >= limits.perMinute) {
    return { allowed: false, reason: 'rate_limit_minute', limit: limits.perMinute, current: minuteCount };
  }
  
  if (hourCount >= limits.perHour) {
    return { allowed: false, reason: 'rate_limit_hour', limit: limits.perHour, current: hourCount };
  }
  
  if (dayCount >= limits.perDay) {
    return { allowed: false, reason: 'rate_limit_day', limit: limits.perDay, current: dayCount };
  }
  
  return { allowed: true };
}

// Increment rate limit counters
function incrementRateLimit(apiKey) {
  const minuteKey = getRateLimitKey(apiKey, 'minute');
  const hourKey = getRateLimitKey(apiKey, 'hour');
  const dayKey = getRateLimitKey(apiKey, 'day');
  
  rateLimitStore.set(minuteKey, (rateLimitStore.get(minuteKey) || 0) + 1);
  rateLimitStore.set(hourKey, (rateLimitStore.get(hourKey) || 0) + 1);
  rateLimitStore.set(dayKey, (rateLimitStore.get(dayKey) || 0) + 1);
  
  // Set expiration (simple cleanup)
  setTimeout(() => rateLimitStore.delete(minuteKey), 60 * 1000); // 1 minute
  setTimeout(() => rateLimitStore.delete(hourKey), 60 * 60 * 1000); // 1 hour
  setTimeout(() => rateLimitStore.delete(dayKey), 24 * 60 * 60 * 1000); // 1 day
}

// Authentication middleware
function authenticateApiKey(req, res, next) {
  console.log('\n🔐 === AUTHENTICATION CHECK ===');
  
  // Skip auth in development mode or if no auth header provided
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.log('⚠️ No authorization header provided - allowing for development');
    req.apiKey = null;
    req.tier = 'free';
    return next();
  }
  
  // Extract API key from Bearer token
  const apiKey = authHeader.replace('Bearer ', '');
  console.log('🔑 API Key provided:', apiKey.substring(0, 8) + '...');
  
  // Validate API key format
  if (!isValidApiKeyFormat(apiKey)) {
    console.log('❌ Invalid API key format');
    return res.status(401).json({
      error: 'Invalid API key format',
      message: 'API key must be in format: sg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    });
  }
  
  // Check if API key exists
  const keyData = API_KEYS.get(apiKey);
  if (!keyData) {
    console.log('❌ API key not found');
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'API key not found or has been revoked'
    });
  }
  
  console.log('✅ API key valid:', keyData.name);
  
  // Check rate limits
  const rateLimitResult = checkRateLimit(apiKey, keyData.tier);
  if (!rateLimitResult.allowed) {
    console.log('❌ Rate limit exceeded:', rateLimitResult.reason);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      reason: rateLimitResult.reason,
      limit: rateLimitResult.limit,
      current: rateLimitResult.current,
      message: `You have exceeded the ${rateLimitResult.reason.replace('rate_limit_', '')} rate limit`
    });
  }
  
  // Increment rate limit counters
  incrementRateLimit(apiKey);
  
  // Update key usage
  keyData.requests += 1;
  keyData.lastUsed = new Date();
  
  // Attach key data to request
  req.apiKey = apiKey;
  req.keyData = keyData;
  req.tier = keyData.tier;
  
  console.log('✅ Authentication successful');
  next();
}

// Middleware to add rate limit headers
function addRateLimitHeaders(req, res, next) {
  if (req.apiKey && req.keyData) {
    const limits = RATE_LIMITS[req.tier] || RATE_LIMITS.free;
    const minuteKey = getRateLimitKey(req.apiKey, 'minute');
    const hourKey = getRateLimitKey(req.apiKey, 'hour');
    const dayKey = getRateLimitKey(req.apiKey, 'day');
    
    const minuteCount = rateLimitStore.get(minuteKey) || 0;
    const hourCount = rateLimitStore.get(hourKey) || 0;
    const dayCount = rateLimitStore.get(dayKey) || 0;
    
    res.setHeader('X-RateLimit-Limit-Minute', limits.perMinute);
    res.setHeader('X-RateLimit-Remaining-Minute', Math.max(0, limits.perMinute - minuteCount));
    res.setHeader('X-RateLimit-Limit-Hour', limits.perHour);
    res.setHeader('X-RateLimit-Remaining-Hour', Math.max(0, limits.perHour - hourCount));
    res.setHeader('X-RateLimit-Limit-Day', limits.perDay);
    res.setHeader('X-RateLimit-Remaining-Day', Math.max(0, limits.perDay - dayCount));
    res.setHeader('X-RateLimit-Tier', req.tier);
  }
  
  next();
}

// Admin functions for key management
function createApiKey(name, tier = 'free') {
  const apiKey = generateApiKey();
  API_KEYS.set(apiKey, {
    name,
    tier,
    requests: 0,
    lastUsed: null,
    created: new Date()
  });
  return apiKey;
}

function revokeApiKey(apiKey) {
  return API_KEYS.delete(apiKey);
}

function listApiKeys() {
  const keys = [];
  for (const [key, data] of API_KEYS.entries()) {
    keys.push({
      key: key.substring(0, 8) + '...',
      name: data.name,
      tier: data.tier,
      requests: data.requests,
      lastUsed: data.lastUsed,
      created: data.created
    });
  }
  return keys;
}

function getApiKeyStats(apiKey) {
  const keyData = API_KEYS.get(apiKey);
  if (!keyData) return null;
  
  const minuteKey = getRateLimitKey(apiKey, 'minute');
  const hourKey = getRateLimitKey(apiKey, 'hour');
  const dayKey = getRateLimitKey(apiKey, 'day');
  
  return {
    ...keyData,
    currentUsage: {
      minute: rateLimitStore.get(minuteKey) || 0,
      hour: rateLimitStore.get(hourKey) || 0,
      day: rateLimitStore.get(dayKey) || 0
    },
    limits: RATE_LIMITS[keyData.tier] || RATE_LIMITS.free
  };
}

module.exports = {
  authenticateApiKey,
  addRateLimitHeaders,
  generateApiKey,
  createApiKey,
  revokeApiKey,
  listApiKeys,
  getApiKeyStats,
  isValidApiKeyFormat,
  RATE_LIMITS
};
