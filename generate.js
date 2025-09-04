const Replicate = require('replicate');

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Helper function to generate image with OpenAI GPT
async function generateImageWithGPT(replicate, prompt, aspectRatio, language, numOutputs, openaiApiKey) {
  console.log('\n🚀 Attempting GPT image generation...');
  
  // Add language instruction to prompt if not English
  let enhancedPrompt = prompt;
  console.log('🌍 Language received in generate.js:', language);
  if (language && language !== 'English') {
    console.log('🔄 Enhancing prompt for language:', language);
    enhancedPrompt = `${prompt}\n\nIMPORTANT: Generate all text content in ${language}. All headlines, subheadlines, call-to-action buttons, and any other text should be in ${language}, not English.`;
    console.log('🎯 Enhanced prompt preview:', enhancedPrompt.substring(0, 300) + '...');
  } else {
    console.log('✅ Using original prompt (English or undefined language)');
  }
  
  const gptInput = {
    prompt: enhancedPrompt,
    openai_api_key: openaiApiKey,
    ...(aspectRatio && { aspect_ratio: aspectRatio }),
    ...(numOutputs && { number_of_images: numOutputs })
  };

  const output = await replicate.run("openai/gpt-image-1", { input: gptInput });
  console.log('✅ GPT image generation successful');
  
  return { output, modelUsed: 'openai/gpt-image-1', isBackup: false };
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

    const { prompt, aspectRatio, language = 'English', numOutputs } = req.body;

    if (!prompt) {
      console.error('❌ Prompt is required');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('✅ Request parameters:');
    console.log('  - Prompt:', prompt.substring(0, 100) + '...');
    console.log('  - Aspect Ratio:', aspectRatio);
    console.log('  - Language:', language);
    console.log('  - Number of outputs:', numOutputs);

    if (!OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY is not set');
      return res.status(500).json({ 
        error: 'OPENAI_API_KEY is not configured',
        timestamp: new Date().toISOString(),
        env_check: 'failed'
      });
    }

    // Initialize Replicate client
    console.log('\n🔧 Initializing Replicate client...');
    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN,
    });
    console.log('✅ Replicate client initialized');

    // Generate image with GPT
    const { output, modelUsed, isBackup } = await generateImageWithGPT(
      replicate, 
      prompt, 
      aspectRatio, 
      language,
      numOutputs, 
      OPENAI_API_KEY
    );

    console.log('\n✅ Model execution completed!');
    console.log('📊 Model used:', modelUsed);
    console.log('📊 Is backup model:', isBackup);
    console.log('📊 Raw output type:', typeof output);
    console.log('📊 Output is array:', Array.isArray(output));

    // Handle the GPT output
    const images = [];
    
    if (output && typeof output === 'object') {
      console.log('🔍 Processing GPT output...');
      
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

    console.log(`\n🎉 SUCCESS: Generated ${images.length} image(s)!`);
    
    return res.status(200).json({
      images: images,
      model_used: modelUsed,
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