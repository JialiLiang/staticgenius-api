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

      // Prepare form data for PhotoRoom API
      const formData = new FormData();
      formData.append('imageFile', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      formData.append('removeBackground', 'false');
      formData.append('referenceBox', 'originalImage');
      formData.append('textRemoval.mode', textRemovalMode);

      // Call PhotoRoom API with POST and form data
      const photoRoomResponse = await axios({
        method: 'POST',
        url: 'https://image-api.photoroom.com/v2/edit',
        data: formData,
        headers: {
          'x-api-key': PHOTOROOM_API_KEY,
          ...formData.getHeaders()
        },
        responseType: 'arraybuffer',
        timeout: 30000
      });

      // Convert response to base64
      const processedImageBuffer = Buffer.from(photoRoomResponse.data);
      const processedBase64Image = `data:${photoRoomResponse.headers['content-type'] || 'image/png'};base64,${processedImageBuffer.toString('base64')}`;

      return res.json({
        success: true,
        imageUrl: processedBase64Image,
        metadata: {
          textRemovalMode: textRemovalMode,
          timestamp: new Date().toISOString()
        }
      });

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