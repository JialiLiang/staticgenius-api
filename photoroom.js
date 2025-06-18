const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

const PHOTOROOM_API_KEY = process.env.PHOTOROOM_API_KEY;

// Format specifications for different aspect ratios
const FORMAT_SPECS = {
  '1.91:1': { width: 1200, height: 628 },
  '4:5': { width: 1200, height: 1500 },
  '1:1': { width: 1200, height: 1200 }
};

// Fallback function to crop image to 1:1 if PhotoRoom fails
async function fallbackCropTo1x1(imageUrl, targetSize = 1200) {
  console.log('\n🔄 === FALLBACK: CROPPING TO 1:1 ===');
  console.log('📥 Downloading image for cropping...');
  
  try {
    // Download the image
    const imageResponse = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer'
    });
    
    const imageBuffer = Buffer.from(imageResponse.data);
    console.log('✅ Image downloaded for cropping');
    
    // Get image metadata to determine crop strategy
    const metadata = await sharp(imageBuffer).metadata();
    console.log('📊 Original dimensions:', `${metadata.width}x${metadata.height}`);
    
    // Center crop to square
    const size = Math.min(metadata.width, metadata.height);
    const left = Math.floor((metadata.width - size) / 2);
    const top = Math.floor((metadata.height - size) / 2);
    
    console.log('✂️ Cropping to center square:', `${size}x${size} at (${left}, ${top})`);
    
    // Crop and resize to target size
    const croppedBuffer = await sharp(imageBuffer)
      .extract({ left, top, width: size, height: size })
      .resize(targetSize, targetSize, { 
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();
    
    // Convert to base64
    const base64Image = `data:image/png;base64,${croppedBuffer.toString('base64')}`;
    
    console.log('✅ Fallback cropping completed');
    console.log(`📊 Final size: ${targetSize}x${targetSize}`);
    console.log(`📊 Base64 size: ${Math.round(base64Image.length / 1024)}KB`);
    
    return {
      success: true,
      imageUrl: base64Image,
      metadata: {
        originalRatio: `${metadata.width}:${metadata.height}`,
        targetRatio: '1:1',
        dimensions: { width: targetSize, height: targetSize },
        method: 'fallback_crop',
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('❌ Fallback cropping failed:', error.message);
    throw error;
  }
}

async function handler(req, res) {
  console.log('\n🎨 === PHOTOROOM API HANDLER ===');
  console.log('📅 Request timestamp:', new Date().toISOString());
  console.log('🔍 Request method:', req.method);
  console.log('📊 Request body keys:', Object.keys(req.body || {}));

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!PHOTOROOM_API_KEY) {
      console.error('❌ PHOTOROOM_API_KEY is not set');
      return res.status(500).json({ 
        error: 'PHOTOROOM_API_KEY is not configured',
        timestamp: new Date().toISOString(),
        env_check: 'failed'
      });
    }

    const { imageUrl, targetRatio, seed, removeText = false } = req.body;

    if (!imageUrl || !targetRatio) {
      console.error('❌ Missing required parameters');
      return res.status(400).json({ 
        error: 'imageUrl and targetRatio are required' 
      });
    }

    const formatSpec = FORMAT_SPECS[targetRatio];
    if (!formatSpec) {
      console.error('❌ Invalid target ratio:', targetRatio);
      return res.status(400).json({ 
        error: `Invalid target ratio. Supported: ${Object.keys(FORMAT_SPECS).join(', ')}` 
      });
    }

    console.log('✅ Request parameters:');
    console.log('  - Image URL:', imageUrl.substring(0, 100) + '...');
    console.log('  - Target Ratio:', targetRatio);
    console.log('  - Format Spec:', formatSpec);
    console.log('  - Seed:', seed);
    console.log('  - Remove Text:', removeText);

    // Download the image from URL
    console.log('\n📥 Downloading image from URL...');
    const imageResponse = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    });

    if (imageResponse.status !== 200) {
      console.error('❌ Failed to download image:', imageResponse.status);
      return res.status(400).json({ error: 'Failed to download image from URL' });
    }

    console.log('✅ Image downloaded successfully');

    // Prepare FormData for PhotoRoom API
    const formData = new FormData();
    formData.append('imageFile', imageResponse.data, {
      filename: 'image.png',
      contentType: 'image/png'
    });

    // PhotoRoom API parameters - Special handling for 1:1 ratio
    const photoRoomData = {
      outputSize: `${formatSpec.width}x${formatSpec.height}`,
      referenceBox: targetRatio === '1:1' ? 'center' : 'originalImage', // Use 'center' for 1:1 ratio
      removeBackground: 'false',
      'expand.mode': 'ai.auto'
    };
    
    // Additional parameter for square images to ensure proper expansion
    if (targetRatio === '1:1') {
      photoRoomData['positioning'] = 'center';
    }

    // Add text removal if enabled
    if (removeText) {
      photoRoomData['textRemoval.mode'] = 'ai.artificial';
      photoRoomData['textRemoval.quality'] = 'high';
    }

    // Add seed if provided
    if (seed !== null && seed !== undefined) {
      photoRoomData['expand.seed'] = String(seed);
    }

    // Append data to form
    Object.entries(photoRoomData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    console.log('\n🔧 PhotoRoom API parameters:', photoRoomData);

    // Call PhotoRoom API with retries
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let requestHeaders;
      try {
        console.log(`\n🚀 PhotoRoom API call attempt ${attempt}/${maxRetries}...`);
        
        // Get headers from FormData (includes proper Content-Type with boundary)
        const formHeaders = formData.getHeaders();
        requestHeaders = {
          'x-api-key': PHOTOROOM_API_KEY,
          ...formHeaders
        };
        
        console.log('📋 Request headers:', Object.keys(requestHeaders));
        console.log('📋 Content-Type:', requestHeaders['content-type']);
        
        const photoRoomResponse = await axios({
          method: 'POST',
          url: 'https://image-api.photoroom.com/v2/edit',
          data: formData,
          headers: requestHeaders,
          responseType: 'arraybuffer',
          timeout: 45000 // Increased timeout for 1:1 processing
        });

        console.log('✅ PhotoRoom API call successful!');
        console.log('📊 Response status:', photoRoomResponse.status);
        console.log('📊 Response headers:', photoRoomResponse.headers['content-type']);

        // Convert response to base64 for easy frontend handling
        const imageBuffer = Buffer.from(photoRoomResponse.data);
        const base64Image = `data:${photoRoomResponse.headers['content-type'] || 'image/png'};base64,${imageBuffer.toString('base64')}`;

        console.log('✅ Image converted to base64');
        console.log(`📊 Base64 size: ${Math.round(base64Image.length / 1024)}KB`);

        return res.json({
          success: true,
          imageUrl: base64Image,
          metadata: {
            originalRatio: 'detected',
            targetRatio: targetRatio,
            dimensions: formatSpec,
            seed: seed,
            removeText: removeText,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error(`❌ PhotoRoom API call attempt ${attempt} failed:`, error.message);
        console.error('Error status:', error.response?.status);
        console.error('Error headers:', error.response?.headers);
        
        // Enhanced error logging for PhotoRoom API response
        if (error.response?.data) {
          try {
            const errorData = error.response.data.toString();
            console.error('Raw error data:', errorData);
            
            // Try to parse as JSON if possible
            try {
              const jsonError = JSON.parse(errorData);
              console.error('Parsed error JSON:', jsonError);
            } catch (parseError) {
              console.error('Error data is not JSON, raw data above');
            }
          } catch (dataError) {
            console.error('Could not extract error data:', dataError);
          }
        }
        
        // Special handling for 1:1 ratio debugging
        if (targetRatio === '1:1') {
          console.error('\n🔍 === SPECIAL DEBUG FOR 1:1 RATIO ===');
          console.error('Target ratio:', targetRatio);
          console.error('Format spec:', formatSpec);
          console.error('Output size:', `${formatSpec.width}x${formatSpec.height}`);
          console.error('PhotoRoom parameters:', photoRoomData);
          console.error('Request headers sent:', Object.keys(requestHeaders || {}));
          console.error('=== END 1:1 DEBUG ===\n');
        }
        
        // Check if this is a Content-Type related error (from PhotoRoom docs)
        if (error.response?.status === 500 && error.message.includes('socket hang up')) {
          console.error('⚠️  Detected potential Content-Type header issue (PhotoRoom 500 error pattern)');
          console.error('💡 This may be related to multipart/form-data header conflicts');
        }
        
        lastError = error;

        if (attempt < maxRetries) {
          const delay = 2000 * attempt; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - try fallback for 1:1 ratio
    console.error('❌ All PhotoRoom API retries failed');
    
    // Use fallback cropping for 1:1 ratio
    if (targetRatio === '1:1') {
      console.log('\n🔄 === ATTEMPTING 1:1 FALLBACK ===');
      console.log('PhotoRoom failed, trying fallback center crop...');
      
      try {
        const fallbackResult = await fallbackCropTo1x1(imageUrl, formatSpec.width);
        console.log('✅ Fallback successful! Returning cropped image.');
        
        return res.json({
          success: true,
          imageUrl: fallbackResult.imageUrl,
          metadata: {
            ...fallbackResult.metadata,
            fallbackReason: 'PhotoRoom AI expansion failed',
            originalError: lastError.message
          }
        });
        
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        // Continue to throw the original PhotoRoom error
      }
    }
    
    throw lastError;

  } catch (error) {
    console.error('\n💥 === FATAL ERROR IN PHOTOROOM HANDLER ===');
    console.error('Error type:', error.constructor?.name);
    console.error('Error message:', error.message);
    console.error('Error status:', error.response?.status);
    console.error('Error response:', error.response?.data);
    console.error('=== END FATAL ERROR ===\n');

    return res.status(500).json({
      error: 'PhotoRoom processing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler; 