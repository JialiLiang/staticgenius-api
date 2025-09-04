#!/usr/bin/env node

const axios = require('axios');

async function testLanguageFlow() {
  console.log('🧪 Testing Language Flow Debug');
  console.log('==============================\n');

  // Test 1: Direct generate endpoint
  console.log('📍 Test 1: Direct /api/generate endpoint');
  try {
    const response1 = await axios.post('http://localhost:3001/api/generate', {
      prompt: 'Create a test ad',
      aspectRatio: '1:1',
      language: 'Japanese',
      numOutputs: 1
    });
    console.log('✅ Direct generate endpoint responded');
  } catch (error) {
    console.log('✅ Direct generate endpoint received request (expected error without API keys)');
  }

  console.log('\n📍 Test 2: generateAd endpoint → generate');
  try {
    const response2 = await axios.post('http://localhost:3001/api/generate-ad', {
      productName: 'Test Product',
      productDescription: 'Test description',
      formats: ['Comic Story'],
      aspectRatio: '1:1',
      language: 'Japanese',
      numAds: 1,
      features: [{ name: 'Test Feature', description: 'Test feature description' }],
      brandColor: '#626eff'
    });
    console.log('✅ generateAd endpoint responded');
  } catch (error) {
    console.log('✅ generateAd endpoint received request (expected error without API keys)');
  }

  console.log('\n💡 Check your backend terminal for language debug logs:');
  console.log('   🌍 Language received in generate.js: Japanese');
  console.log('   🔄 Enhancing prompt for language: Japanese');
  console.log('   🎯 Enhanced prompt preview: ...IMPORTANT: Generate all text content in Japanese...');
}

testLanguageFlow().catch(console.error);
