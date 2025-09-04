const axios = require('axios');

async function checkDeployment() {
  try {
    console.log('🔍 Checking Railway deployment status...');
    
    const response = await axios.get('https://staticgenius-api-production.up.railway.app/api/generate');
    
    console.log('✅ Deployment Response:');
    console.log('- Gemini Key Present:', response.data.geminiKeyPresent || 'Not yet deployed');
    console.log('- Available Models:', response.data.availableModels || 'Not yet available');
    console.log('- Message:', response.data.message);
    
    if (response.data.geminiKeyPresent) {
      console.log('🎉 Gemini integration is ready!');
    } else {
      console.log('⏳ Still waiting for deployment or environment variable...');
    }
    
  } catch (error) {
    console.error('❌ Error checking deployment:', error.message);
  }
}

checkDeployment();
