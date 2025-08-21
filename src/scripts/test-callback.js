const axios = require('axios');
require('dotenv').config();

async function testCallback() {
  console.log('🧪 Testing transcode callback...');
  
  const callbackData = {
    videoId: '6b0f93da-33f7-44b1-81b7-0e35be636b44', // Use one of the pending videos
    organizationId: '659b9a2c-4f58-4590-bc18-d2d1385b0fb0',
    assetKey: 'org/659b9a2c-4f58-4590-bc18-d2d1385b0fb0/video/6b0f93da-33f7-44b1-81b7-0e35be636b44',
    hlsMasterPath: 'hls/master.m3u8',
    thumbnailPath: 'hls/thumbnail.jpg',
    durationSeconds: 120
  };
  
  try {
    console.log('Sending callback to: http://localhost:4000/api/videos/transcode/callback');
    console.log('Payload:', JSON.stringify(callbackData, null, 2));
    
    const response = await axios.post('http://localhost:4000/api/videos/transcode/callback', callbackData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('✅ Callback successful!');
    console.log('Response:', response.status, response.data);
    
  } catch (error) {
    console.error('❌ Callback failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testCallback();
