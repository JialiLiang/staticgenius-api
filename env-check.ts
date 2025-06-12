import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const envCheck = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    replicateTokenPresent: !!process.env.REPLICATE_API_TOKEN,
    replicateTokenLength: process.env.REPLICATE_API_TOKEN?.length || 0,
    openaiKeyPresent: !!process.env.OPENAI_API_KEY,
    openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    // Show first few characters for debugging (safely)
    replicateTokenPrefix: process.env.REPLICATE_API_TOKEN?.substring(0, 8) + '...' || 'NOT_SET',
    openaiKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 8) + '...' || 'NOT_SET',
  };

  console.log('Environment check:', envCheck);

  return res.status(200).json(envCheck);
} 