// Simple CommonJS API endpoint for testing
module.exports = (req, res) => {
  console.log('Hello API endpoint called');
  
  res.status(200).json({
    message: 'Hello from Vercel API!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    type: 'CommonJS'
  });
}; 