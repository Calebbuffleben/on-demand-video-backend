const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function checkVideoStatus() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 Checking video status in database...\n');
    
    // Get all videos from last 24 hours
    const videos = await prisma.video.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Found ${videos.length} videos from last 24 hours:\n`);
    
    for (const video of videos) {
      console.log(`🎥 Video: ${video.id}`);
      console.log(`   Name: ${video.name}`);
      console.log(`   Status: ${video.status}`);
      console.log(`   Provider: ${video.provider || 'NOT_SET'}`);
      console.log(`   Asset Key: ${video.assetKey || 'NOT_SET'}`);
      console.log(`   Playback HLS: ${video.playbackHlsPath || 'NOT_SET'}`);
      console.log(`   Playback URL (MUX): ${video.playbackUrl || 'NOT_SET'}`);
      console.log(`   Thumbnail Path: ${video.thumbnailPath || 'NOT_SET'}`);
      console.log(`   Duration: ${video.duration || 'NOT_SET'}`);
      console.log(`   Created: ${video.createdAt}`);
      console.log(`   Updated: ${video.updatedAt}`);
      console.log('');
    }
    
    // Check pending videos
    const pendingVideos = await prisma.pendingVideo.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    if (pendingVideos.length > 0) {
      console.log(`\n📝 Found ${pendingVideos.length} pending videos:\n`);
      for (const pending of pendingVideos) {
        console.log(`⏳ Pending: ${pending.id}`);
        console.log(`   Name: ${pending.name}`);
        console.log(`   Status: ${pending.status}`);
        console.log(`   Created: ${pending.createdAt}`);
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking video status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVideoStatus();
