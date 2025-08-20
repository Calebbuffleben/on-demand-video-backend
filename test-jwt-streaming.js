#!/usr/bin/env node

/**
 * Script to test JWT streaming endpoints
 * Usage: node test-jwt-streaming.js <video-id>
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/videos';
const VIDEO_ID = process.argv[2];

if (!VIDEO_ID) {
  console.error('Usage: node test-jwt-streaming.js <video-id>');
  process.exit(1);
}

async function testJwtStreaming() {
  try {
    console.log(`🎬 Testing JWT streaming for video: ${VIDEO_ID}\n`);

    // 1. Generate playback token (this would normally be done by authenticated user)
    console.log('📝 Step 1: Generate playback token...');
    // Note: This will fail without proper authentication in real scenario
    // For testing purposes, you might need to add a test endpoint or use a real auth token
    
    try {
      const tokenResponse = await axios.post(`${BASE_URL}/${VIDEO_ID}/playback-token`, {
        expiryMinutes: 10
      }, {
        headers: {
          'Authorization': 'Bearer YOUR_AUTH_TOKEN_HERE' // Replace with real token
        }
      });
      
      const { token } = tokenResponse.data;
      console.log(`✅ Token generated: ${token.substring(0, 20)}...`);
      
      // 2. Test master playlist
      console.log('\n📋 Step 2: Fetch master playlist...');
      const masterResponse = await axios.get(`${BASE_URL}/stream/${VIDEO_ID}/master.m3u8?token=${token}`);
      console.log(`✅ Master playlist fetched (${masterResponse.data.length} chars)`);
      console.log('First few lines:');
      console.log(masterResponse.data.split('\n').slice(0, 5).join('\n'));
      
      // 3. Test segment (we'd need to parse the playlist to get actual segment names)
      console.log('\n🎥 Step 3: Test segment access...');
      
      // Extract a variant playlist from master
      const variantLine = masterResponse.data.split('\n').find(line => line.includes('variant_'));
      if (variantLine) {
        const variantUrl = variantLine.split('?')[0]; // Remove existing token if any
        console.log(`📋 Testing variant playlist: ${variantUrl}`);
        
        const variantResponse = await axios.get(`${BASE_URL}/stream/${VIDEO_ID}/seg/${variantUrl}?token=${token}`);
        console.log(`✅ Variant playlist fetched (${variantResponse.data.length} chars)`);
        
        // Extract a segment from variant playlist
        const segmentLine = variantResponse.data.split('\n').find(line => line.includes('segment_') && line.endsWith('.ts'));
        if (segmentLine) {
          const segmentUrl = segmentLine.split('?')[0]; // Remove existing token if any
          console.log(`🎥 Testing video segment: ${segmentUrl}`);
          
          const segmentResponse = await axios.get(`${BASE_URL}/stream/${VIDEO_ID}/seg/${segmentUrl}?token=${token}`, {
            responseType: 'arraybuffer'
          });
          console.log(`✅ Video segment fetched (${segmentResponse.data.byteLength} bytes)`);
        }
      }
      
      // 4. Test thumbnail
      console.log('\n🖼️  Step 4: Test thumbnail access...');
      const thumbResponse = await axios.get(`${BASE_URL}/thumb/${VIDEO_ID}/0001.jpg?token=${token}`, {
        responseType: 'arraybuffer'
      });
      console.log(`✅ Thumbnail fetched (${thumbResponse.data.byteLength} bytes)`);
      
      // 5. Test invalid token
      console.log('\n🚫 Step 5: Test invalid token...');
      try {
        await axios.get(`${BASE_URL}/stream/${VIDEO_ID}/master.m3u8?token=invalid-token`);
        console.log('❌ Invalid token test failed - should have been rejected');
      } catch (error) {
        if (error.response?.status === 401) {
          console.log('✅ Invalid token correctly rejected (401)');
        } else {
          console.log(`⚠️  Unexpected error: ${error.response?.status} - ${error.message}`);
        }
      }
      
      console.log('\n🎉 JWT streaming test completed successfully!');
      
    } catch (authError) {
      console.log('❌ Token generation failed (expected without auth)');
      console.log('To test manually:');
      console.log(`1. Get auth token from frontend login`);
      console.log(`2. POST ${BASE_URL}/${VIDEO_ID}/playback-token`);
      console.log(`3. Use returned token in streaming URLs`);
      console.log(`\nExample streaming URL: ${BASE_URL}/stream/${VIDEO_ID}/master.m3u8?token=YOUR_JWT_TOKEN`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testJwtStreaming();
