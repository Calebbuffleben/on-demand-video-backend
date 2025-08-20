const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function debugHls() {
  const prisma = new PrismaClient();
  
  try {
    const videoId = 'd9595e37-d49e-4cf2-80ce-7d44e7791dbf';
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    
    if (!video) {
      console.log('❌ Video not found');
      return;
    }
    
    console.log('🎥 Video details:');
    console.log('   ID:', video.id);
    console.log('   Provider:', video.provider);
    console.log('   Asset Key:', video.assetKey);
    console.log('   Playback HLS Path:', video.playbackHlsPath);
    console.log('   Thumbnail Path:', video.thumbnailPath);
    
    const filename = 'master.m3u8';
    const hlsPath = `${video.assetKey}/hls/${filename}`;
    console.log('\n🔍 Constructed HLS path:', hlsPath);
    
    if (video.thumbnailPath) {
      const thumbnailPath = `${video.assetKey}/${video.thumbnailPath}`;
      console.log('🖼️  Constructed thumbnail path:', thumbnailPath);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugHls();
