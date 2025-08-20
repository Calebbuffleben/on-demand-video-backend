import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixVideoProvider() {
  try {
    console.log('🔧 Fixing video provider for existing videos...');
    
    // Find all videos that have assetKey (internal videos) - they should have provider = INTERNAL
    const videosToFix = await prisma.video.findMany({
      where: {
        assetKey: {
          not: null
        }
      }
    });
    
    console.log(`Found ${videosToFix.length} videos to fix`);
    
    for (const video of videosToFix) {
      console.log(`Fixing video ${video.id} (${video.name})`);
      
      await prisma.video.update({
        where: { id: video.id },
        data: {
          provider: 'INTERNAL'
        }
      });
      
      console.log(`✅ Fixed video ${video.id}`);
    }
    
    console.log('🎉 All videos fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing videos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixVideoProvider();
