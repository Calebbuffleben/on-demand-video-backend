const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

async function testR2Direct() {
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    const key = 'org/00c38d90-c35d-4598-97e0-2a243505eba6/video/d9595e37-d49e-4cf2-80ce-7d44e7791dbf/hls/master.m3u8';
    console.log('Testing direct R2 access for:', key);
    
    // Get signed URL for reading
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log('✅ Signed URL generated:');
    console.log(signedUrl);
    
    console.log('\n🧪 Test this URL in browser or with curl to verify it works');
    
  } catch (error) {
    console.error('❌ Error generating signed URL:', error);
  }
}

testR2Direct();
