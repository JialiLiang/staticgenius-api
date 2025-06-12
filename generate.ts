import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from 'replicate';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log('\n=== VERCEL GPT-IMAGE-1 DEBUG ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Environment check:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('  - REPLICATE_API_TOKEN present:', !!REPLICATE_API_TOKEN);
  console.log('  - OPENAI_API_KEY present:', !!OPENAI_API_KEY);

  if (req.method === 'GET') {
    // Return environment check for GET requests
    const envCheck = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      replicateTokenPresent: !!REPLICATE_API_TOKEN,
      replicateTokenLength: REPLICATE_API_TOKEN?.length || 0,
      openaiKeyPresent: !!OPENAI_API_KEY,
      openaiKeyLength: OPENAI_API_KEY?.length || 0,
      replicateTokenPrefix: REPLICATE_API_TOKEN?.substring(0, 8) + '...' || 'NOT_SET',
      openaiKeyPrefix: OPENAI_API_KEY?.substring(0, 8) + '...' || 'NOT_SET',
      message: 'Environment check - use POST to generate images'
    };
    console.log('Environment check via GET:', envCheck);
    return res.status(200).json(envCheck);
  }

  if (req.method !== 'POST') {
    console.error('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!REPLICATE_API_TOKEN) {
      console.error('❌ REPLICATE_API_TOKEN is not set');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('REPLICATE')));
      return res.status(500).json({ 
        error: 'REPLICATE_API_TOKEN is not configured',
        timestamp: new Date().toISOString(),
        env_check: 'failed'
      });
    }

    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not set');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('OPENAI')));
      return res.status(500).json({ 
        error: 'OPENAI_API_KEY is not configured',
        timestamp: new Date().toISOString(),
        env_check: 'failed'
      });
    }

    const { prompt, aspectRatio, numOutputs } = req.body;

    if (!prompt) {
      console.error('❌ Prompt is required');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('✅ Request parameters:');
    console.log('  - Prompt:', prompt.substring(0, 100) + '...');
    console.log('  - Aspect Ratio:', aspectRatio);
    console.log('  - Number of outputs:', numOutputs);
    console.log('  - REPLICATE_API_TOKEN:', REPLICATE_API_TOKEN ? `Set (${REPLICATE_API_TOKEN.substring(0, 10)}...)` : 'Not set');
    console.log('  - OPENAI_API_KEY:', OPENAI_API_KEY ? `Set (sk-${OPENAI_API_KEY.substring(3, 13)}...)` : 'Not set');

    // Initialize Replicate client (following official example)
    console.log('\n🔧 Initializing Replicate client...');
    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN,
    });
    console.log('✅ Replicate client initialized');

    // Prepare input exactly as shown in official example
    const input = {
      prompt: prompt,
      openai_api_key: OPENAI_API_KEY,
      // Optional parameters based on your needs
      ...(aspectRatio && { aspect_ratio: aspectRatio }),
      ...(numOutputs && { number_of_images: numOutputs })
    };

    console.log('\n🤖 Model configuration (official format):');
    console.log('  - Model: openai/gpt-image-1');
    console.log('  - Input:', JSON.stringify(input, (key, value) => {
      if (key === 'openai_api_key') return '[REDACTED]';
      return value;
    }, 2));

    console.log('\n🚀 Calling openai/gpt-image-1 model...');
    console.log('📝 This should generate high-quality images using OpenAI GPT-Image-1!');

    // Call the model exactly as shown in official example
    const output = await replicate.run("openai/gpt-image-1", { input });

    console.log('\n✅ Model execution completed!');
    console.log('📊 Raw output type:', typeof output);
    console.log('📊 Output is array:', Array.isArray(output));
    console.log('📊 Output keys:', Object.keys(output || {}));

    // Handle the GPT-Image-1 output format
    const images: string[] = [];
    
    if (output && typeof output === 'object') {
      console.log('🔍 Detailed output analysis:');
      console.log('Full output:', JSON.stringify(output, null, 2));
      
      // GPT-Image-1 returns objects with URL properties
      for (const [index, imageData] of Object.entries(output)) {
        console.log(`📸 Processing image ${index}:`, typeof imageData);
        console.log(`📸 Image ${index} content:`, imageData);
        
        // Handle ReadableStream objects (common for GPT-Image-1)
        if (imageData && typeof imageData === 'object' && (imageData as any).constructor && (imageData as any).constructor.name === 'ReadableStream') {
          console.log(`🌊 Image ${index} is ReadableStream - attempting to read...`);
          try {
            // ReadableStream might contain URL or binary data
            const reader = (imageData as any).getReader();
            const chunks: Uint8Array[] = [];
            let done = false;
            
            while (!done) {
              const { value, done: readerDone } = await reader.read();
              done = readerDone;
              if (value) {
                chunks.push(value);
              }
            }
            
            // Combine chunks and try to decode
            const combined = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
            let offset = 0;
            for (const chunk of chunks) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }
            
            // Try to decode as text first (might be a URL)
            const text = new TextDecoder().decode(combined);
            console.log(`📝 ReadableStream decoded text (first 100 chars):`, text.substring(0, 100));
            
            if (text.startsWith('http')) {
              images.push(text.trim());
              console.log(`✅ Image ${index} extracted URL from stream: ${text.trim()}`);
            } else {
              // Convert binary data to base64 (Node.js version)
              const base64 = Buffer.from(combined).toString('base64');
              const dataUrl = `data:image/png;base64,${base64}`;
              images.push(dataUrl);
              console.log(`✅ Image ${index} converted stream to base64 (${base64.length} chars)`);
            }
          } catch (streamError) {
            console.log(`⚠️ Image ${index} ReadableStream processing failed:`, (streamError as any).message);
            // Fallback: check if the stream object itself has URL properties
            if ((imageData as any).url && typeof (imageData as any).url === 'string') {
              images.push((imageData as any).url);
              console.log(`✅ Image ${index} fallback URL from stream object:`, (imageData as any).url);
            }
          }
        }
        // Handle URL objects (standard case)
        else if (imageData && typeof imageData === 'object' && (imageData as any).url) {
          images.push((imageData as any).url);
          console.log(`✅ Image ${index} extracted URL: ${(imageData as any).url}`);
        }
        // Handle direct URL strings
        else if (typeof imageData === 'string' && imageData.startsWith('http')) {
          images.push(imageData);
          console.log(`✅ Image ${index} is direct URL: ${imageData}`);
        }
        // Handle objects that might have other URL properties
        else if (imageData && typeof imageData === 'object') {
          // Look for common URL properties
                     const urlProps = ['url', 'href', 'src', 'link'];
           let found = false;
           for (const prop of urlProps) {
             if ((imageData as any)[prop] && typeof (imageData as any)[prop] === 'string' && (imageData as any)[prop].startsWith('http')) {
               images.push((imageData as any)[prop]);
               console.log(`✅ Image ${index} extracted from .${prop}: ${(imageData as any)[prop]}`);
               found = true;
               break;
             }
           }
                     if (!found) {
             console.log(`⚠️ Image ${index} object has no recognizable URL property:`, Object.keys(imageData as any));
             // Try to convert the whole object to string as fallback
             const objStr = (imageData as any).toString();
             if (objStr.startsWith('http')) {
               images.push(objStr);
               console.log(`✅ Image ${index} converted object to URL: ${objStr}`);
             }
           }
        }
        // Handle plain strings that might be URLs
        else if (typeof imageData === 'string') {
          images.push(imageData);
          console.log(`✅ Image ${index} is string: ${imageData.substring(0, 50)}...`);
        }
        else {
          console.log(`⚠️ Image ${index} unknown format:`, typeof imageData, imageData);
        }
      }
    } else {
      console.error('❌ Unexpected output format:', typeof output, output);
      throw new Error('Unexpected output format from GPT-Image-1');
    }

    console.log(`\n🎉 SUCCESS: Generated ${images.length} image(s) with openai/gpt-image-1!`);
    console.log('=== END DEBUG ===\n');
    
    return res.status(200).json({
      images: images,
      model_used: 'openai/gpt-image-1',
      output_format: 'base64_data_urls',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('\n❌ ERROR with openai/gpt-image-1:');
    console.error('Error message:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
    console.error('Full error:', error);
    
    if (error.response) {
      console.error('API Response status:', error.response.status);
      console.error('API Response statusText:', error.response.statusText);
      console.error('API Response headers:', error.response.headers);
      console.error('API Response data:', error.response.data);
    }
    
    // Check if it's a network/connection error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('🌐 Network connectivity issue detected');
    }
    
    // Check if it's an authentication error
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('🔐 Authentication/Authorization issue detected');
      console.error('REPLICATE_API_TOKEN status:', REPLICATE_API_TOKEN ? 'Present' : 'Missing');
      console.error('OPENAI_API_KEY status:', OPENAI_API_KEY ? 'Present' : 'Missing');
    }
    
    // Check if it's a rate limiting error
    if (error.response?.status === 429) {
      console.error('⏱️ Rate limiting detected');
    }
    
    // Check if it's a server error
    if (error.response?.status >= 500) {
      console.error('🔥 Server error detected - API may be down');
    }
    
    console.log('=== END DEBUG (WITH ERROR) ===\n');
    
    return res.status(500).json({
      error: error.message || 'Failed to generate image',
      model_attempted: 'openai/gpt-image-1',
      error_type: error.constructor.name,
      error_code: error.code,
      status_code: error.response?.status,
      timestamp: new Date().toISOString()
    });
  }
} 