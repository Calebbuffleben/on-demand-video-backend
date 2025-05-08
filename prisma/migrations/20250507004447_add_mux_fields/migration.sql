-- DropIndex
DROP INDEX "Video_cloudflareId_key";

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "muxTokenId" TEXT,
ADD COLUMN     "muxTokenSecret" TEXT;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "muxAssetId" TEXT,
ADD COLUMN     "muxPlaybackId" TEXT,
ADD COLUMN     "muxUploadId" TEXT,
ALTER COLUMN "cloudflareId" DROP NOT NULL;
