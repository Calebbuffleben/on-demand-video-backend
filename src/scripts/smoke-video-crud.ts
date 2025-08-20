import { PrismaClient, VideoProvider, VideoStatus, Visibility } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Ensure an organization exists (create a temp one if none)
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Smoke Test Org' },
    });
    console.log('Created test organization:', org.id);
  }

  // Create a video using new fields
  const created = await prisma.video.create({
    data: {
      name: 'Smoke Test Video',
      description: 'Video created by smoke test',
      organizationId: org.id,
      status: VideoStatus.PROCESSING,
      visibility: Visibility.PUBLIC,
      tags: [],
      provider: VideoProvider.INTERNAL,
      assetKey: `org/${org.id}/video/smoke-test`,
      jobId: 'job_smoke_1',
      playbackHlsPath: null,
      thumbnailPath: null,
    },
  });
  console.log('Created video:', created.id, created.provider, created.assetKey);

  // Read it back
  const fetched = await prisma.video.findUnique({ where: { id: created.id } });
  console.log('Fetched video status:', fetched?.status, 'provider:', fetched?.provider);

  // Update basic field
  const updated = await prisma.video.update({
    where: { id: created.id },
    data: { status: VideoStatus.READY, playbackHlsPath: 'hls/master.m3u8' },
  });
  console.log('Updated video status:', updated.status, 'playbackHlsPath:', updated.playbackHlsPath);

  // Cleanup
  await prisma.video.delete({ where: { id: created.id } });
  console.log('Deleted video:', created.id);
}

main()
  .catch((e) => {
    console.error('Smoke video CRUD failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


