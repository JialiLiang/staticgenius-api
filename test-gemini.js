const axios = require('axios');

async function testGemini() {
  try {
    console.log('🧪 Testing Gemini integration...');
    
    const response = await axios.post('http://localhost:3001/api/generate', {
      prompt: 'Create a simple advertisement for a photo editing app with the text "PhotoPro" and a clean, modern design',
      aspectRatio: '1:1',
      language: 'English',
      numOutputs: 1,
      model: 'nano-banana'
    });
    
    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Model used:', response.data.model_used);
    console.log('Images generated:', response.data.images?.length || 0);
    console.log('Image count in response:', response.data.images?.length || 0);
    if (response.data.images && response.data.images.length > 0) {
      console.log('First image type:', typeof response.data.images[0]);
      console.log('First image starts with data:', response.data.images[0].startsWith('data:'));
    }
    
    if (response.data.images && response.data.images.length > 0) {
      console.log('🖼️ First image preview:', response.data.images[0].substring(0, 100) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testGemini();
