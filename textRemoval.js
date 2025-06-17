const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const PHOTOROOM_API_KEY = process.env.PHOTOROOM_API_KEY;

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
}).single('imageFile');

async function handler(req, res) {
  console.log('\n🔤 === TEXT REMOVAL API HANDLER ===');
  console.log('📅 Request timestamp:', new Date().toISOString());
  console.log('🔍 Request method:', req.method);

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle file upload first
  upload(req, res, async (err) => {
    if (err) {
      console.error('❌ File upload error:', err.message);
      return res.status(400).json({ error: err.message });
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

      if (!req.file) {
        console.error('❌ No file uploaded');
        return res.status(400).json({ error: 'No image file uploaded' });
      }

      const { textRemovalMode = 'ai.all' } = req.body;

      console.log('✅ Request parameters:');
      console.log('  - File name:', req.file.originalname);
      console.log('  - File size:', Math.round(req.file.size / 1024) + 'KB');
      console.log('  - File type:', req.file.mimetype);
      console.log('  - Text Removal Mode:', textRemovalMode);

      console.log('✅ Image file received successfully');

      // Prepare FormData for PhotoRoom API
      const formData = new FormData();
      formData.append('imageFile', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });

    // PhotoRoom API parameters for text removal
    const photoRoomData = {
      removeBackground: 'false',
      referenceBox: 'originalImage',
      'textRemoval.mode': textRemovalMode
    };

    // Append data to form
    Object.entries(photoRoomData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    console.log('\n🔧 PhotoRoom API parameters:', photoRoomData);

    // Call PhotoRoom API with retries
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n🚀 PhotoRoom API call attempt ${attempt}/${maxRetries}...`);
        
        const photoRoomResponse = await axios({
          method: 'POST',
          url: 'https://image-api.photoroom.com/v2/edit',
          data: formData,
          headers: {
            'x-api-key': PHOTOROOM_API_KEY,
            ...formData.getHeaders()
          },
          responseType: 'arraybuffer',
          timeout: 30000 // 30 second timeout
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
            textRemovalMode: textRemovalMode,
            timestamp: new Date().toISOString()
          }
        });

      } catch (error) {
        console.error(`❌ PhotoRoom API call attempt ${attempt} failed:`, error.message);
        console.error('Error status:', error.response?.status);
        console.error('Error data:', error.response?.data?.toString());
        lastError = error;

        if (attempt < maxRetries) {
          const delay = 2000 * attempt; // Exponential backoff
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

      // All retries failed
      console.error('❌ All PhotoRoom API retries failed');
      throw lastError;

    } catch (error) {
      console.error('\n💥 === FATAL ERROR IN TEXT REMOVAL HANDLER ===');
      console.error('Error type:', error.constructor?.name);
      console.error('Error message:', error.message);
      console.error('Error status:', error.response?.status);
      console.error('Error response:', error.response?.data);
      console.error('=== END FATAL ERROR ===\n');

      return res.status(500).json({
        error: 'Text removal processing failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
}

module.exports = handler; 