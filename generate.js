const Replicate = require('replicate');
const { GoogleGenAI } = require('@google/genai');

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDhaMw6vkI-kmhhTecyLWRBfg5pW_QSn2k';

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

// Helper function to generate image with Google Gemini (Nano Banana)
async function generateImageWithGemini(prompt, aspectRatio, language, numOutputs, geminiApiKey) {
  console.log('\n🍌 Attempting Gemini (Nano Banana) image generation...');
  console.log('📐 Requested aspect ratio:', aspectRatio);
  
  // Build enhanced prompt with aspect ratio and language instructions
  let enhancedPrompt = prompt;
  
  // Add aspect ratio instruction
  if (aspectRatio) {
    console.log('🎯 Adding aspect ratio instruction to prompt:', aspectRatio);
    enhancedPrompt = `Create an image with ${aspectRatio} aspect ratio. ${enhancedPrompt}`;
  }
  
  // Add language instruction if not English
  console.log('🌍 Language received for Gemini:', language);
  if (language && language !== 'English') {
    console.log('🔄 Enhancing prompt for language:', language);
    enhancedPrompt = `${enhancedPrompt}\n\nIMPORTANT: Generate all text content in ${language}. All headlines, subheadlines, call-to-action buttons, and any other text should be in ${language}, not English.`;
  }
  
  console.log('🎯 Final enhanced prompt preview:', enhancedPrompt.substring(0, 300) + '...');

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });
  
  // Generate the specified number of images
  const images = [];
  const numImagesToGenerate = numOutputs || 1;
  
  console.log(`🎨 Generating ${numImagesToGenerate} image(s) with Gemini...`);
  
  for (let i = 0; i < numImagesToGenerate; i++) {
    try {
      console.log(`🖼️ Generating image ${i + 1}/${numImagesToGenerate}...`);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: enhancedPrompt,
        generationConfig: {
          temperature: 1.2,  // Higher temperature for more creative/varied outputs
          topP: 0.95,        // Controls diversity of token selection
          topK: 40,          // Limits token candidates for better quality
        }
      });

      console.log(`📊 Gemini response for image ${i + 1} - candidates:`, response.candidates?.length || 0);
      if (response.candidates && response.candidates[0]) {
        console.log(`📊 Parts in response:`, response.candidates[0].content?.parts?.length || 0);
      }

      // Extract image data from response
      if (!response.candidates || !response.candidates[0] || !response.candidates[0].content || !response.candidates[0].content.parts) {
        console.error(`❌ Invalid response structure for image ${i + 1}`);
        continue;
      }

      for (const [partIndex, part] of response.candidates[0].content.parts.entries()) {
        console.log(`📊 Part ${partIndex}: hasText=${!!part.text}, hasInlineData=${!!part.inlineData}`);
        if (part.inlineData) {
          // The data is already base64 encoded, just create the data URL
          const imageData = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          const dataUrl = `data:${mimeType};base64,${imageData}`;
          images.push(dataUrl);
          console.log(`✅ Gemini image ${i + 1} generated successfully - size: ${imageData.length} chars`);
          console.log(`🖼️ Data URL preview: ${dataUrl.substring(0, 100)}...`);
          break; // Only take the first image from each generation
        }
      }
    } catch (error) {
      console.error(`❌ Error generating Gemini image ${i + 1}:`, error.message);
      // Continue with other images even if one fails
    }
  }
  
  if (images.length === 0) {
    throw new Error('No images were generated by Gemini');
  }
  
  console.log(`✅ Gemini generation completed: ${images.length}/${numImagesToGenerate} images successful`);
  
  // Return in the same format as GPT function for consistency
  const output = {};
  images.forEach((imageUrl, index) => {
    output[index] = { url: imageUrl };
  });
  
  return { output, modelUsed: 'gemini-2.5-flash-image-preview', isBackup: false };
}

async function handler(req, res) {
  console.log('\n=== VERCEL GPT-IMAGE-1 DEBUG (JS VERSION) ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Environment check:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('  - REPLICATE_API_TOKEN present:', !!REPLICATE_API_TOKEN);
  console.log('  - OPENAI_API_KEY present:', !!OPENAI_API_KEY);
  console.log('  - GEMINI_API_KEY present:', !!GEMINI_API_KEY);

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
      geminiKeyPresent: !!GEMINI_API_KEY,
      geminiKeyLength: GEMINI_API_KEY?.length || 0,
      replicateTokenPrefix: REPLICATE_API_TOKEN?.substring(0, 8) + '...' || 'NOT_SET',
      openaiKeyPrefix: OPENAI_API_KEY?.substring(0, 8) + '...' || 'NOT_SET',
      geminiKeyPrefix: GEMINI_API_KEY?.substring(0, 8) + '...' || 'NOT_SET',
      availableModels: ['gpt-image-1', 'nano-banana'],
      message: 'Environment check - use POST to generate images with model selection (JS VERSION)'
    };
    console.log('Environment check via GET:', envCheck);
    return res.status(200).json(envCheck);
  }

  if (req.method !== 'POST') {
    console.error('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    const { prompt, aspectRatio, language = 'English', numOutputs, model = 'gpt-image-1' } = req.body;

    if (!prompt) {
      console.error('❌ Prompt is required');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('✅ Request parameters:');
    console.log('  - Prompt:', prompt.substring(0, 100) + '...');
    console.log('  - Aspect Ratio:', aspectRatio);
    console.log('  - Language:', language);
    console.log('  - Number of outputs:', numOutputs);
    console.log('  - Model:', model);

    // Generate image based on selected model
    let output, modelUsed, isBackup;
    
    if (model === 'nano-banana' || model === 'gemini') {
      // Generate with Gemini
      if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY is not set');
        return res.status(500).json({ 
          error: 'GEMINI_API_KEY is not configured',
          timestamp: new Date().toISOString(),
          env_check: 'failed'
        });
      }
      
      const result = await generateImageWithGemini(
        prompt, 
        aspectRatio, 
        language,
        numOutputs, 
        GEMINI_API_KEY
      );
      output = result.output;
      modelUsed = result.modelUsed;
      isBackup = result.isBackup;
    } else {
      // Generate with GPT (default)
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

      const result = await generateImageWithGPT(
        replicate, 
        prompt, 
        aspectRatio, 
        language,
        numOutputs, 
        OPENAI_API_KEY
      );
      output = result.output;
      modelUsed = result.modelUsed;
      isBackup = result.isBackup;
    }

    console.log('\n✅ Model execution completed!');
    console.log('📊 Model used:', modelUsed);
    console.log('📊 Is backup model:', isBackup);
    console.log('📊 Raw output type:', typeof output);
    console.log('📊 Output is array:', Array.isArray(output));
    console.log('📊 Output structure preview:', JSON.stringify(output, null, 2).substring(0, 500) + '...');

    // Handle the output (both GPT and Gemini)
    const images = [];
    
    if (output && typeof output === 'object') {
      console.log('🔍 Processing output...');
      console.log('📊 Output keys:', Object.keys(output));
      
      for (const [index, imageData] of Object.entries(output)) {
        console.log(`📊 Processing image ${index}:`, typeof imageData, imageData?.toString?.()?.substring(0, 50) + '...');
        
        console.log(`🔍 Image ${index} detailed check:`, {
          hasImageData: !!imageData,
          type: typeof imageData,
          isObject: typeof imageData === 'object',
          hasUrlProperty: imageData && typeof imageData === 'object' && 'url' in imageData,
          urlValue: imageData && typeof imageData === 'object' ? imageData.url : 'N/A'
        });
        
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
          // Check if url is already a string (HTTP or data URL)
          else if (typeof urlValue === 'string' && (urlValue.startsWith('http') || urlValue.startsWith('data:'))) {
            images.push(urlValue);
            console.log(`✅ Image ${index} extracted URL string: ${urlValue.substring(0, 50)}...`);
          }
          // Check if url is a URL object with href property
          else if (urlValue && typeof urlValue === 'object' && urlValue.href) {
            images.push(urlValue.href);
            console.log(`✅ Image ${index} extracted URL from .href: ${urlValue.href}`);
          }
          else {
            console.log(`⚠️ Image ${index} url property is not a string or function:`, typeof urlValue, urlValue);
          }
        } else if (typeof imageData === 'string' && (imageData.startsWith('http') || imageData.startsWith('data:'))) {
          images.push(imageData);
          console.log(`✅ Image ${index} is direct URL/data: ${imageData.substring(0, 50)}...`);
        } else if (typeof imageData === 'string') {
          // For Gemini, imageData might be a data URL directly
          images.push(imageData);
          console.log(`✅ Image ${index} processed as string: ${imageData.substring(0, 50)}...`);
        } else {
          console.log(`⚠️ Image ${index} unknown format:`, typeof imageData, imageData?.toString?.()?.substring(0, 100));
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