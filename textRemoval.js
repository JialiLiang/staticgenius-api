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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!PHOTOROOM_API_KEY) {
        return res.status(500).json({ error: 'PHOTOROOM_API_KEY is not configured' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }

      const { textRemovalMode = 'ai.all' } = req.body;

      console.log('✅ Processing text removal');
      console.log('  - File size:', Math.round(req.file.size / 1024) + 'KB');
      console.log('  - Text Removal Mode:', textRemovalMode);

      // Use the exact same pattern as photoroom.js
      const imageBuffer = req.file.buffer;

      // Prepare FormData for PhotoRoom API (exact same as expand)
      const formData = new FormData();
      formData.append('imageFile', imageBuffer, {
        filename: 'image.png',
        contentType: 'image/png'
      });

      // PhotoRoom API parameters for text removal
      const photoRoomData = {
        referenceBox: 'originalImage',
        removeBackground: 'false',
        'textRemoval.mode': textRemovalMode
      };

      // Append data to form (exact same as expand)
      Object.entries(photoRoomData).forEach(([key, value]) => {
        formData.append(key, value);
      });

      console.log('🔧 PhotoRoom API parameters:', photoRoomData);

      // Call PhotoRoom API with retries (exact same as expand)
      const maxRetries = 3;
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let requestHeaders;
        try {
          console.log(`🚀 PhotoRoom API call attempt ${attempt}/${maxRetries}...`);
          
          const formHeaders = formData.getHeaders();
          requestHeaders = {
            'x-api-key': PHOTOROOM_API_KEY,
            ...formHeaders
          };
          
          const photoRoomResponse = await axios({
            method: 'POST',
            url: 'https://image-api.photoroom.com/v2/edit',
            data: formData,
            headers: requestHeaders,
            responseType: 'arraybuffer',
            timeout: 45000 // Same timeout as expand
          });

          console.log('✅ PhotoRoom API call successful!');
          console.log('📊 Response status:', photoRoomResponse.status);

          // Convert response to base64 (exact same as expand)
          const processedImageBuffer = Buffer.from(photoRoomResponse.data);
          const processedBase64Image = `data:${photoRoomResponse.headers['content-type'] || 'image/png'};base64,${processedImageBuffer.toString('base64')}`;

          console.log('✅ Text removal completed');
          console.log(`📊 Base64 size: ${Math.round(processedBase64Image.length / 1024)}KB`);

          return res.json({
            success: true,
            imageUrl: processedBase64Image,
            metadata: {
              textRemovalMode: textRemovalMode,
              timestamp: new Date().toISOString()
            }
          });

        } catch (error) {
          console.error(`❌ PhotoRoom API call attempt ${attempt} failed:`, error.message);
          console.error('Error status:', error.response?.status);
          lastError = error;

          if (attempt < maxRetries) {
            const delay = 2000 * attempt;
            console.log(`⏳ Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      console.error('❌ All PhotoRoom API retries failed');
      throw lastError;

    } catch (error) {
      console.error('Text removal error:', error.message);
      return res.status(500).json({
        error: 'Text removal processing failed',
        message: error.message
      });
    }
  });
}

module.exports = handler; 