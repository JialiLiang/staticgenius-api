const Replicate = require('replicate');

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Helper function to generate image with Google Imagen-4 as backup
async function generateImageWithFallback(replicate, prompt, aspectRatio, numOutputs, openaiApiKey) {
  let modelUsed = 'openai/gpt-image-1';
  let isBackup = false;
  
  try {
    console.log('\n🚀 Attempting GPT image generation...');
    
    const gptInput = {
      prompt: prompt,
      openai_api_key: openaiApiKey,
      ...(aspectRatio && { aspect_ratio: aspectRatio }),
      ...(numOutputs && { number_of_images: numOutputs })
    };

    const output = await replicate.run("openai/gpt-image-1", { input: gptInput });
    console.log('✅ GPT image generation successful');
    
    return { output, modelUsed, isBackup };
    
  } catch (gptError) {
    console.warn('⚠️ GPT image generation failed:', gptError.message);
    console.log('🔄 Switching to Google Imagen-4 backup...');
    
    try {
      modelUsed = 'google/imagen-4';
      isBackup = true;
      
      // Convert aspect ratio format if needed (e.g., "1:1" to "1:1")
      let imagenAspectRatio = aspectRatio;
      if (aspectRatio === '1:1') {
        imagenAspectRatio = '1:1';
      } else if (aspectRatio === '16:9') {
        imagenAspectRatio = '16:9';
      } else if (aspectRatio === '9:16') {
        imagenAspectRatio = '9:16';
      } else if (aspectRatio === '4:3') {
        imagenAspectRatio = '4:3';
      } else if (aspectRatio === '3:4') {
        imagenAspectRatio = '3:4';
      }
      
      // Google Imagen-4 generates one image per request, so we need to make multiple requests
      const requestedImages = numOutputs || 1;
      console.log(`📊 Generating ${requestedImages} image(s) with Google Imagen-4...`);
      
      const imagenPromises = [];
      for (let i = 0; i < requestedImages; i++) {
        const imagenInput = {
          prompt: prompt,
          aspect_ratio: imagenAspectRatio || "1:1",
          output_format: "jpg",
          safety_filter_level: "block_medium_and_above"
        };
        
        imagenPromises.push(replicate.run("google/imagen-4", { input: imagenInput }));
      }
      
      // Wait for all image generations to complete
      const outputs = await Promise.all(imagenPromises);
      console.log(`✅ Google Imagen-4 generation successful: ${outputs.length} image(s)`);
      
      // Return all outputs as an array to match GPT format
      return { output: outputs, modelUsed, isBackup };
      
    } catch (imagenError) {
      console.error('❌ Both GPT and Google Imagen-4 failed');
      console.error('GPT Error:', gptError.message);
      console.error('Imagen-4 Error:', imagenError.message);
      throw new Error(`Both image generation services failed. GPT: ${gptError.message}, Imagen-4: ${imagenError.message}`);
    }
  }
}

async function handler(req, res) {
  console.log('\n=== VERCEL GPT-IMAGE-1 DEBUG (JS VERSION) ===');
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
      message: 'Environment check - use POST to generate images (JS VERSION)'
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

    // OpenAI key is optional now since we have Google Imagen-4 backup
    if (!OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY is not set - will only use Google Imagen-4');
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

    // Initialize Replicate client
    console.log('\n🔧 Initializing Replicate client...');
    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN,
    });
    console.log('✅ Replicate client initialized');

    // Generate image with fallback
    const { output, modelUsed, isBackup } = await generateImageWithFallback(
      replicate, 
      prompt, 
      aspectRatio, 
      numOutputs, 
      OPENAI_API_KEY
    );

    console.log('\n✅ Model execution completed!');
    console.log('📊 Model used:', modelUsed);
    console.log('📊 Is backup model:', isBackup);
    console.log('📊 Raw output type:', typeof output);
    console.log('📊 Output is array:', Array.isArray(output));

    // Handle the output (simplified for testing)
    const images = [];
    
    if (output && typeof output === 'object') {
      console.log('🔍 Processing output...');
      
      // Handle Google Imagen-4 output (array of URL objects)
      if (modelUsed === 'google/imagen-4' && Array.isArray(output)) {
        console.log('🔍 Processing Google Imagen-4 output array...');
        
        for (const [index, imageOutput] of output.entries()) {
          if (imageOutput && imageOutput.url) {
            const urlValue = imageOutput.url;
            if (typeof urlValue === 'function') {
              try {
                const actualUrl = urlValue();
                if (typeof actualUrl === 'string' && actualUrl.startsWith('http')) {
                  images.push(actualUrl);
                  console.log(`✅ Google Imagen-4 image ${index + 1} URL extracted from function: ${actualUrl}`);
                } else if (actualUrl && typeof actualUrl === 'object' && actualUrl.href) {
                  images.push(actualUrl.href);
                  console.log(`✅ Google Imagen-4 image ${index + 1} URL extracted from function.href: ${actualUrl.href}`);
                }
              } catch (urlError) {
                console.log(`⚠️ Error calling Google Imagen-4 image ${index + 1} url function:`, urlError.message);
              }
            } else if (typeof urlValue === 'string' && urlValue.startsWith('http')) {
              images.push(urlValue);
              console.log(`✅ Google Imagen-4 image ${index + 1} URL string: ${urlValue}`);
            } else if (urlValue && typeof urlValue === 'object' && urlValue.href) {
              images.push(urlValue.href);
              console.log(`✅ Google Imagen-4 image ${index + 1} URL from .href: ${urlValue.href}`);
            }
          }
        }
      } 
      // Handle GPT image output (multiple images)
      else {
        for (const [index, imageData] of Object.entries(output)) {
          if (imageData && typeof imageData === 'object' && imageData.url) {
            const urlValue = imageData.url;
            // Check if url is a function that needs to be called
            if (typeof urlValue === 'function') {
              try {
                const actualUrl = urlValue();
                if (typeof actualUrl === 'string' && actualUrl.startsWith('http')) {
                  images.push(actualUrl);
                  console.log(`✅ Image ${index} extracted URL from function: ${actualUrl}`);
                } else if (actualUrl && typeof actualUrl === 'object' && actualUrl.href) {
                  images.push(actualUrl.href);
                  console.log(`✅ Image ${index} extracted URL from function.href: ${actualUrl.href}`);
                } else {
                  console.log(`⚠️ Image ${index} url function returned non-URL:`, typeof actualUrl, actualUrl);
                }
              } catch (urlError) {
                console.log(`⚠️ Image ${index} error calling url function:`, urlError.message);
              }
            }
            // Check if url is already a string
            else if (typeof urlValue === 'string' && urlValue.startsWith('http')) {
              images.push(urlValue);
              console.log(`✅ Image ${index} extracted URL string: ${urlValue}`);
            }
            // Check if url is a URL object with href property
            else if (urlValue && typeof urlValue === 'object' && urlValue.href) {
              images.push(urlValue.href);
              console.log(`✅ Image ${index} extracted URL from .href: ${urlValue.href}`);
            }
            else {
              console.log(`⚠️ Image ${index} url property is not a string or function:`, typeof urlValue, urlValue);
            }
          } else if (typeof imageData === 'string' && imageData.startsWith('http')) {
            images.push(imageData);
            console.log(`✅ Image ${index} is direct URL: ${imageData}`);
          } else {
            console.log(`⚠️ Image ${index} unknown format:`, typeof imageData);
          }
        }
      }
    }

    console.log(`\n🎉 SUCCESS: Generated ${images.length} image(s)!`);
    
    return res.status(200).json({
      images: images,
      model_used: modelUsed,
      is_backup: isBackup,
      backup_message: isBackup ? 'GPT image generation was unavailable, switched to Google Imagen-4' : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('Error message:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Full error:', error);
    
    return res.status(500).json({
      error: error.message || 'Failed to generate image',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler; 