-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('INTERNAL', 'MUX');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "assetKey" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "playbackHlsPath" TEXT,
ADD COLUMN     "provider" "VideoProvider" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "thumbnailPath" TEXT;
