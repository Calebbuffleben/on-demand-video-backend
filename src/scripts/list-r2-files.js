const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function listR2Files() {
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    console.log('📂 Listing R2 files for video d9595e37-d49e-4cf2-80ce-7d44e7791dbf...\n');
    
    const prefix = 'org/00c38d90-c35d-4598-97e0-2a243505eba6/video/d9595e37-d49e-4cf2-80ce-7d44e7791dbf/';
    
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET,
      Prefix: prefix,
      MaxKeys: 100
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('❌ No files found with prefix:', prefix);
      return;
    }
    
    console.log(`✅ Found ${response.Contents.length} files:`);
    response.Contents.forEach(obj => {
      console.log(`   📄 ${obj.Key} (${obj.Size} bytes, ${obj.LastModified})`);
    });
    
  } catch (error) {
    console.error('❌ Error listing R2 files:', error);
  }
}

listR2Files();
