const multer = require('multer');
const Replicate = require('replicate');

// Configure Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Language mapping for better prompts
const LANGUAGE_PROMPTS = {
  'BR': 'Brazilian Portuguese',
  'CN': 'Chinese (Simplified)',
  'DE': 'German',
  'EN': 'English',
  'ES': 'Spanish',
  'FR': 'French',
  'IN': 'Hindi',
  'IT': 'Italian',
  'JP': 'Japanese',
  'KR': 'Korean',
  'MY': 'Malay',
  'NL': 'Dutch',
  'PH': 'Filipino',
  'PL': 'Polish',
  'SA': 'Arabic',
  'TH': 'Thai',
  'TR': 'Turkish',
  'VN': 'Vietnamese',
  'ID': 'Indonesian',
  'HK': 'Chinese (Traditional)',
  'CZ': 'Czech',
};

const translateImage = async (req, res) => {
  console.log('\n🌍 === IMAGE TRANSLATION REQUEST ===');
  
  try {
    // Handle file upload
    upload.single('imageFile')(req, res, async (err) => {
      if (err) {
        console.error('❌ File upload error:', err);
        return res.status(400).json({
          success: false,
          error: 'File upload failed: ' + err.message
        });
      }

      const { targetLanguage, aspectRatio } = req.body;
      const imageFile = req.file;

      if (!imageFile) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      if (!targetLanguage) {
        return res.status(400).json({
          success: false,
          error: 'No target language provided'
        });
      }

      // Add error checking for API keys
      if (!process.env.OPENAI_API_KEY) {
        console.error('❌ OpenAI API key not found');
        return res.status(500).json({
          success: false,
          error: 'OpenAI API key not found. Please check your .env file.'
        });
      }

      if (!process.env.REPLICATE_API_TOKEN) {
        console.error('❌ Replicate API token not found');
        return res.status(500).json({
          success: false,
          error: 'Replicate API token not found. Please check your .env file.'
        });
      }

      console.log('📊 Request details:', {
        fileName: imageFile.originalname,
        fileSize: imageFile.size,
        mimeType: imageFile.mimetype,
        targetLanguage: targetLanguage,
        aspectRatio: aspectRatio || '1:1'
      });

      // Convert image to base64
      const base64Image = imageFile.buffer.toString('base64');
      const imageDataUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

      // Get language name for prompt
      const languageName = LANGUAGE_PROMPTS[targetLanguage] || targetLanguage;

      // Use provided aspect ratio or default to 1:1
      const finalAspectRatio = aspectRatio || '1:1';
      
      // Create translation prompt with dynamic aspect ratio
      const formatDescriptions = {
        '1:1': 'square format ideal for social media and balanced compositions',
        '2:3': 'portrait format ideal for mobile displays and vertical layouts', 
        '3:2': 'landscape format ideal for desktop displays and horizontal layouts'
      };

      const prompt = `Translate and adapt this image for a ${languageName}-speaking audience in ${finalAspectRatio} format.

Requirements:
- Translate text naturally — fluent and culturally appropriate for ${languageName}
- Keep layout, design, and image quality the same
- Adapt composition for ${finalAspectRatio} aspect ratio (${formatDescriptions[finalAspectRatio] || formatDescriptions['1:1']})
- Return a professional image that looks native to ${languageName} users`;

      console.log(`🎯 Processing image for ${languageName} with aspect ratio ${finalAspectRatio}`);
      console.log(`📝 Prompt length: ${prompt.length} characters`);

      // Process with Replicate - correct format for openai/gpt-image-1
      const inputParams = {
        prompt: prompt,
        input_images: [imageDataUrl],
        aspect_ratio: finalAspectRatio,
        openai_api_key: process.env.OPENAI_API_KEY,  // OpenAI API key passed to Replicate
        quality: "auto",
        background: "auto",
        moderation: "auto",
        number_of_images: 1,
        output_format: "png",
        output_compression: 90
      };

      console.log('🎨 Processing with Replicate GPT-Image-1...');
      console.log('🔧 Input parameters:', Object.keys(inputParams));

      try {
        const output = await replicate.run(
          "openai/gpt-image-1",  // Replicate model that uses OpenAI's GPT-4 Vision
          { input: inputParams }
        );

        console.log('✅ Replicate processing completed');
        console.log('📊 Output type:', typeof output);
        console.log('📊 Output:', Array.isArray(output) ? `Array with ${output.length} items` : output);

        // Handle the output - it might be an array or a single URL
        let translatedImageUrl;
        if (Array.isArray(output) && output.length > 0) {
          translatedImageUrl = output[0];
        } else if (typeof output === 'string') {
          translatedImageUrl = output;
        } else {
          throw new Error('Unexpected output format from Replicate');
        }

        console.log('🖼️ Generated image URL:', translatedImageUrl.substring(0, 100) + '...');

        // Return the translated image
        res.json({
          success: true,
          imageUrl: translatedImageUrl,
          language: targetLanguage,
          metadata: {
            originalFileName: imageFile.originalname,
            targetLanguage: languageName,
            timestamp: new Date().toISOString()
          }
        });

        console.log('🎉 Translation completed successfully');

      } catch (replicateError) {
        console.error(`❌ Replicate API error details: ${String(replicateError)}`);
        throw new Error(`Replicate API error: ${String(replicateError)}`);
      }

    });

  } catch (error) {
    console.error('❌ Translation error:', error);
    res.status(500).json({
      success: false,
      error: 'Translation failed: ' + error.message
    });
  }
};

module.exports = translateImage; 