import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();
const configService = new ConfigService();

async function updateMuxCredentials() {
  const organizationId = 'c222be01-c010-41cd-932b-1f494446181b';
  const muxTokenId = process.env.MUX_TOKEN_ID;
  const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!muxTokenId || !muxTokenSecret) {
    console.error('MUX_TOKEN_ID and MUX_TOKEN_SECRET must be set in environment variables');
    process.exit(1);
  }

  try {
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        muxTokenId,
        muxTokenSecret,
      },
    });

    console.log('Successfully updated Mux credentials for organization:', {
      id: updatedOrg.id,
      name: updatedOrg.name,
      muxTokenId: updatedOrg.muxTokenId ? '***' : null,
      muxTokenSecret: updatedOrg.muxTokenSecret ? '***' : null,
    });
  } catch (error) {
    console.error('Error updating Mux credentials:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateMuxCredentials(); 