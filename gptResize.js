const multer = require('multer');
const Replicate = require('replicate');
const sharp = require('sharp');
const axios = require('axios');

// Configure Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Maximum dimensions for input images (to prevent issues and reduce costs)
// GPT-1 generally works better with smaller, more manageable image sizes
const MAX_INPUT_DIMENSIONS = {
  width: 3000,   // Reasonable limit for GPT processing
  height: 3000,  // Reasonable limit for GPT processing
  maxFileSize: 15 * 1024 * 1024 // 15MB max
};

// Compress and resize image if it's too large
async function compressImageForGPT(imageBuffer) {
  console.log('\n🔄 === COMPRESSING IMAGE FOR GPT-1 ===');
  
  try {
    // Validate the input buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Invalid image buffer provided');
    }

    const metadata = await sharp(imageBuffer).metadata();
    console.log('📊 Original image:', `${metadata.width}x${metadata.height}`, `${Math.round(imageBuffer.length / 1024)}KB`);
    
    let needsCompression = false;
    let targetWidth = metadata.width;
    let targetHeight = metadata.height;
    
    // Check if image is too large
    if (metadata.width > MAX_INPUT_DIMENSIONS.width || 
        metadata.height > MAX_INPUT_DIMENSIONS.height ||
        imageBuffer.length > MAX_INPUT_DIMENSIONS.maxFileSize) {
      needsCompression = true;
      
      // Calculate new dimensions while maintaining aspect ratio
      const aspectRatio = metadata.width / metadata.height;
      
      if (metadata.width > metadata.height) {
        // Landscape - limit by width
        targetWidth = Math.min(metadata.width, MAX_INPUT_DIMENSIONS.width);
        targetHeight = Math.round(targetWidth / aspectRatio);
      } else {
        // Portrait or square - limit by height
        targetHeight = Math.min(metadata.height, MAX_INPUT_DIMENSIONS.height);
        targetWidth = Math.round(targetHeight * aspectRatio);
      }
      
      console.log('⚠️ Image too large, compressing to:', `${targetWidth}x${targetHeight}`);
    }
    
    if (needsCompression) {
      const compressedBuffer = await sharp(imageBuffer)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .png({ 
          quality: 80,        // More aggressive compression
          compressionLevel: 9 // Maximum PNG compression
        })
        .toBuffer();
      
      console.log('✅ Image compressed:', `${targetWidth}x${targetHeight}`, `${Math.round(compressedBuffer.length / 1024)}KB`);
      console.log('📉 Size reduction:', `${Math.round((1 - compressedBuffer.length / imageBuffer.length) * 100)}%`);
      
      // Validate compressed buffer
      if (!compressedBuffer || compressedBuffer.length === 0) {
        throw new Error('Image compression resulted in empty buffer');
      }
      
      return compressedBuffer;
    } else {
      console.log('✅ Image size OK, no compression needed');
      return imageBuffer;
    }
    
  } catch (error) {
    console.error('❌ Image compression failed:', error.message);
    throw error;
  }
}

// Configure multer for file uploads with better error handling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    fieldSize: 50 * 1024 * 1024, // 50MB field size limit
    files: 1 // Only allow 1 file
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 File filter check:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).single('imageFile');

const gptResize = async (req, res) => {
  console.log('\n🎨 === GPT-1 RESIZE REQUEST ===');
  console.log('📊 Request headers:', {
    'content-type': req.headers['content-type'],
    'content-length': req.headers['content-length']
  });
  
  // Handle file upload with better error handling
  upload(req, res, async (uploadErr) => {
    if (uploadErr) {
      console.error('❌ Multer upload error:', uploadErr.message);
      console.error('❌ Upload error code:', uploadErr.code);
      
      // Handle specific multer errors
      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 50MB.',
          errorType: 'FILE_TOO_LARGE'
        });
      } else if (uploadErr.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          error: 'Unexpected file field. Use "imageFile" field name.',
          errorType: 'UNEXPECTED_FILE_FIELD'
        });
      } else if (uploadErr.message.includes('Unexpected end of form')) {
        return res.status(400).json({ 
          error: 'Form data was incomplete. Please try uploading again.',
          errorType: 'INCOMPLETE_FORM_DATA'
        });
      } else {
        return res.status(400).json({ 
          error: uploadErr.message,
          errorType: 'UPLOAD_ERROR'
        });
      }
    }

    try {
      const imageFile = req.file;

      if (!imageFile) {
        console.error('❌ No image file received');
        console.error('❌ Request headers:', req.headers);
        console.error('❌ Request body keys:', Object.keys(req.body || {}));
        return res.status(400).json({
          success: false,
          error: 'No image file provided',
          errorType: 'MISSING_FILE',
          received: {
            headers: req.headers['content-type'],
            bodyKeys: Object.keys(req.body || {}),
            hasFile: !!req.file
          }
        });
      }

      // Check for required API keys
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
        bufferLength: imageFile.buffer ? imageFile.buffer.length : 0
      });

      // Validate file buffer
      if (!imageFile.buffer || imageFile.buffer.length === 0) {
        console.error('❌ Invalid file buffer');
        return res.status(400).json({
          success: false,
          error: 'Invalid file buffer received',
          errorType: 'INVALID_BUFFER'
        });
      }

      // Compress image if needed
      let compressedBuffer;
      try {
        compressedBuffer = await compressImageForGPT(imageFile.buffer);
      } catch (compressionError) {
        console.error('❌ Image compression failed:', compressionError);
        return res.status(400).json({
          success: false,
          error: 'Image processing failed: ' + compressionError.message,
          errorType: 'COMPRESSION_ERROR'
        });
      }

      // Validate compressed buffer
      if (!compressedBuffer || compressedBuffer.length === 0) {
        console.error('❌ Compression resulted in empty buffer');
        return res.status(400).json({
          success: false,
          error: 'Image compression resulted in empty buffer',
          errorType: 'COMPRESSION_EMPTY_RESULT'
        });
      }

      // Convert compressed image to base64
      const base64Image = compressedBuffer.toString('base64');
      const imageDataUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

      // Validate base64 conversion
      if (!base64Image || base64Image.length === 0) {
        console.error('❌ Base64 conversion failed');
        return res.status(400).json({
          success: false,
          error: 'Base64 conversion failed',
          errorType: 'BASE64_CONVERSION_ERROR'
        });
      }

      console.log('✅ Image successfully processed and converted to base64');
      console.log('📊 Base64 size:', Math.round(base64Image.length / 1024) + 'KB');

      // Create a simple prompt for resizing to 3:2 landscape
      const resizePrompt = `Resize this image to 3:2 landscape format. Keep all elements visible and readable.`;

      console.log('🎯 Processing image for intelligent 3:2 resize...');
      console.log('📝 Using specialized resize prompt');

      // Process with Replicate GPT-1
      const inputParams = {
        prompt: resizePrompt,
        input_images: [imageDataUrl],
        aspect_ratio: '3:2',
        openai_api_key: process.env.OPENAI_API_KEY,
        quality: "auto",
        background: "auto",
        moderation: "auto",
        number_of_images: 1,
        output_format: "png",
        output_compression: 90
      };

      console.log('🎨 Processing with Replicate GPT-1...');
      console.log('🔧 Input parameters:', Object.keys(inputParams));
      console.log('🔧 Checking format compatibility:');
      console.log('  - prompt:', inputParams.prompt.substring(0, 50) + '...');
      console.log('  - input_images length:', inputParams.input_images.length);
      console.log('  - aspect_ratio:', inputParams.aspect_ratio);
      console.log('  - openai_api_key present:', !!inputParams.openai_api_key);

      try {
        const output = await replicate.run(
          "openai/gpt-image-1",  // Replicate model that uses OpenAI's GPT-4 Vision
          { input: inputParams }
        );

        console.log('✅ Replicate processing completed');
        console.log('📊 Output type:', typeof output);
        console.log('📊 Output:', Array.isArray(output) ? `Array with ${output.length} items` : output);

        // Handle the output based on official Replicate example (same as imageTranslation.js)
        let resizedImageUrl;
        if (Array.isArray(output) && output.length > 0) {
          console.log('📊 Output[0] type:', typeof output[0]);
          console.log('📊 Output[0] structure:', JSON.stringify(output[0], null, 2));
          
          // Check if output[0] has a url() method (as shown in Replicate example)
          if (output[0] && typeof output[0].url === 'function') {
            resizedImageUrl = output[0].url();
            console.log('📊 URL from .url() method:', typeof resizedImageUrl, resizedImageUrl);
          } else if (typeof output[0] === 'string') {
            resizedImageUrl = output[0];
            console.log('📊 Direct string URL:', resizedImageUrl);
          } else if (output[0] && typeof output[0] === 'object') {
            // Sometimes the output might be an object with URL property
            if (output[0].url && typeof output[0].url === 'string') {
              resizedImageUrl = output[0].url;
              console.log('📊 URL from .url property:', resizedImageUrl);
            } else if (output[0].href && typeof output[0].href === 'string') {
              resizedImageUrl = output[0].href;
              console.log('📊 URL from .href property:', resizedImageUrl);
            } else {
              console.log('📊 Unknown object structure, using first property that looks like a URL');
              // Try to find any property that looks like a URL
              for (const [key, value] of Object.entries(output[0])) {
                if (typeof value === 'string' && (value.startsWith('http') || value.startsWith('data:'))) {
                  resizedImageUrl = value;
                  console.log(`📊 Found URL in property ${key}:`, resizedImageUrl);
                  break;
                }
              }
            }
          }
          
          if (!resizedImageUrl) {
            console.log('📊 Could not extract URL from output[0], using fallback');
            resizedImageUrl = output[0]; // Fallback
          }
        } else if (typeof output === 'string') {
          resizedImageUrl = output;
        } else {
          console.log('📊 Unexpected output structure:', output);
          throw new Error('Unexpected output format from Replicate');
        }

        // Ensure resizedImageUrl is a string before using string methods
        const urlString = typeof resizedImageUrl === 'string' ? resizedImageUrl : String(resizedImageUrl);
        console.log('🖼️ Final image URL type:', typeof urlString);
        console.log('🖼️ Generated 3:2 image URL:', urlString.length > 100 ? urlString.substring(0, 100) + '...' : urlString);

        // IMPORTANT FIX: Convert the Replicate URL to base64 data URL
        // This prevents PhotoRoom from having to download the URL (which causes 400 errors)
        console.log('\n🔄 === CONVERTING REPLICATE URL TO BASE64 ===');
        console.log('📥 Downloading image from Replicate URL...');
        
        let finalImageUrl;
        try {
          // Download the image from Replicate
          const imageResponse = await axios({
            method: 'GET',
            url: urlString,
            responseType: 'arraybuffer',
            timeout: 30000 // 30 second timeout
          });

          if (imageResponse.status !== 200) {
            console.error('❌ Failed to download from Replicate:', imageResponse.status);
            throw new Error(`Failed to download from Replicate: ${imageResponse.status}`);
          }

          const imageBuffer = Buffer.from(imageResponse.data);
          console.log('✅ Image downloaded from Replicate');
          console.log('📊 Image size:', Math.round(imageBuffer.length / 1024) + 'KB');

          // Convert to base64 data URL
          const base64Image = imageBuffer.toString('base64');
          finalImageUrl = `data:image/png;base64,${base64Image}`;
          
          console.log('✅ Converted to base64 data URL');
          console.log('📊 Base64 size:', Math.round(base64Image.length / 1024) + 'KB');

        } catch (downloadError) {
          console.error('❌ Failed to download/convert Replicate image:', downloadError.message);
          console.error('🔄 Falling back to original URL...');
          finalImageUrl = urlString; // Fallback to original URL
        }

        // Return the resized image (as base64 data URL when possible)
        res.json({
          success: true,
          imageUrl: finalImageUrl,
          metadata: {
            originalFileName: imageFile.originalname,
            targetRatio: '3:2',
            method: 'gpt_vision_intelligent_resize',
            urlType: finalImageUrl.startsWith('data:') ? 'base64_data_url' : 'external_url',
            timestamp: new Date().toISOString()
          }
        });

        console.log('🎉 GPT-1 resize completed successfully');

      } catch (replicateError) {
        console.error(`❌ Replicate API error details: ${String(replicateError)}`);
        throw new Error(`Replicate API error: ${String(replicateError)}`);
      }

    } catch (error) {
      console.error('\n💥 === FATAL ERROR IN GPT RESIZE HANDLER ===');
      console.error('Error type:', error.constructor?.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('=== END FATAL ERROR ===\n');

      return res.status(500).json({
        success: false,
        error: 'GPT resize failed: ' + error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
};

module.exports = gptResize; 