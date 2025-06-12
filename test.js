export default function handler(req, res) {
  console.log('Test API endpoint called');
  
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Test API endpoint is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
} 