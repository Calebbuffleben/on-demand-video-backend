const { S3Client, CreateMultipartUploadCommand, UploadPartCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

async function testR2() {
  console.log('Testing R2 connectivity and generating test URL...');

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    // 1. Create multipart upload
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET,
      Key: 'test-debug/test-file.txt',
      ContentType: 'text/plain',
    });

    const createResult = await s3Client.send(createCommand);
    console.log('✓ Multipart upload created:', createResult.UploadId);

    // 2. Generate presigned URL for part 1
    const partCommand = new UploadPartCommand({
      Bucket: process.env.R2_BUCKET,
      Key: 'test-debug/test-file.txt',
      UploadId: createResult.UploadId,
      PartNumber: 1,
    });

    const partUrl = await getSignedUrl(s3Client, partCommand, { expiresIn: 900 });
    console.log('✓ Part upload URL generated');
    console.log('URL:', partUrl);

    console.log('\n🧪 MANUAL TEST:');
    console.log('Run this curl command to test CORS:');
    console.log(`curl -X PUT "${partUrl}" \\`);
    console.log(`  -H "Content-Type: application/octet-stream" \\`);
    console.log(`  -d "test data" \\`);
    console.log(`  -v`);

    console.log('\n📋 Expected CORS Configuration for R2 bucket:');
    console.log(JSON.stringify([{
      "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
      "AllowedMethods": ["PUT", "GET", "HEAD", "OPTIONS"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag", "x-amz-checksum-crc32", "x-amz-checksum-crc32c", "x-amz-checksum-sha1", "x-amz-checksum-sha256"],
      "MaxAgeSeconds": 300
    }], null, 2));

    // Don't abort here - let user test manually first
    console.log('\n⚠️  Note: Not aborting upload so you can test. Clean up manually if needed.');
    
  } catch (error) {
    console.error('❌ R2 test failed:', error);
    if (error.Code) {
      console.error('Error code:', error.Code);
      console.error('Error message:', error.message);
    }
  }
}

testR2();
