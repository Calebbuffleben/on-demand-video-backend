import { PrismaClient } from '@prisma/client';

// This script migrates video options from JSON fields to explicit fields
async function main() {
  console.log('Starting migration of video options...');
  
  const prisma = new PrismaClient();
  
  try {
    // Get all videos including raw fields
    // We need to use the raw query because the generated models don't include the old fields
    const result = await prisma.$queryRaw`
      SELECT id, "displayOptions"::text as display_options, "embedOptions"::text as embed_options
      FROM "Video"
      WHERE "displayOptions" IS NOT NULL OR "embedOptions" IS NOT NULL
    `;
    
    const videos = result as { id: string; display_options?: string; embed_options?: string }[];
    console.log(`Found ${videos.length} videos to process.`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each video
    for (const video of videos) {
      try {
        console.log(`Processing video ${video.id}...`);
        
        // Default display options
        let displayOptions = {
          showProgressBar: true,
          showTitle: true,
          showPlaybackControls: true,
          autoPlay: false,
          muted: false,
          loop: false
        };
        
        // Default embed options
        let embedOptions = {
          showVideoTitle: true,
          showUploadDate: true,
          showMetadata: true,
          allowFullscreen: true,
          responsive: true,
          showBranding: true,
          showTechnicalInfo: false
        };
        
        // Try to parse any existing displayOptions
        if (video.display_options) {
          try {
            const parsedOptions = JSON.parse(video.display_options);
            
            // Merge with defaults
            displayOptions = {
              ...displayOptions,
              ...parsedOptions
            };
          } catch (err) {
            console.warn(`Failed to parse displayOptions for video ${video.id}:`, err);
          }
        }
        
        // Try to parse any existing embedOptions
        if (video.embed_options) {
          try {
            const parsedOptions = JSON.parse(video.embed_options);
            
            // Merge with defaults
            embedOptions = {
              ...embedOptions,
              ...parsedOptions
            };
          } catch (err) {
            console.warn(`Failed to parse embedOptions for video ${video.id}:`, err);
          }
        }
        
        // Update the video with explicit fields
        await prisma.video.update({
          where: { id: video.id },
          data: {
            // Display options
            showProgressBar: displayOptions.showProgressBar,
            showTitle: displayOptions.showTitle,
            showPlaybackControls: displayOptions.showPlaybackControls,
            autoPlay: displayOptions.autoPlay,
            muted: displayOptions.muted,
            loop: displayOptions.loop,
            
            // Embed options
            showVideoTitle: embedOptions.showVideoTitle,
            showUploadDate: embedOptions.showUploadDate,
            showMetadata: embedOptions.showMetadata,
            allowFullscreen: embedOptions.allowFullscreen,
            responsive: embedOptions.responsive,
            showBranding: embedOptions.showBranding,
            showTechnicalInfo: embedOptions.showTechnicalInfo,
          },
        });
        
        console.log(`Successfully migrated options for video ${video.id}`);
        successCount++;
      } catch (error) {
        console.error(`Error processing video ${video.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Migration completed: ${successCount} videos processed successfully, ${errorCount} errors`);
    
    // Now drop the old columns if they exist
    try {
      console.log('Dropping old displayOptions and embedOptions columns...');
      
      // Check if columns exist first
      const columnsExist = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='Video' AND column_name IN ('displayOptions', 'embedOptions')
      `;
      
      if (Array.isArray(columnsExist) && columnsExist.length > 0) {
        // Drop the columns if they exist
        await prisma.$executeRaw`
          ALTER TABLE "Video" 
          DROP COLUMN IF EXISTS "displayOptions",
          DROP COLUMN IF EXISTS "embedOptions"
        `;
        console.log('Old columns dropped successfully');
      } else {
        console.log('Old columns do not exist, skipping drop operation');
      }
    } catch (error) {
      console.error('Failed to drop old columns:', error);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
main()
  .then(() => console.log('Migration script completed'))
  .catch(e => console.error('Migration script failed:', e)); 