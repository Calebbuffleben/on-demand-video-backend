-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "allowFullscreen" BOOLEAN DEFAULT true,
ADD COLUMN     "autoPlay" BOOLEAN DEFAULT false,
ADD COLUMN     "loop" BOOLEAN DEFAULT false,
ADD COLUMN     "muted" BOOLEAN DEFAULT false,
ADD COLUMN     "responsive" BOOLEAN DEFAULT true,
ADD COLUMN     "showBranding" BOOLEAN DEFAULT true,
ADD COLUMN     "showMetadata" BOOLEAN DEFAULT true,
ADD COLUMN     "showPlaybackControls" BOOLEAN DEFAULT true,
ADD COLUMN     "showProgressBar" BOOLEAN DEFAULT true,
ADD COLUMN     "showTechnicalInfo" BOOLEAN DEFAULT false,
ADD COLUMN     "showTitle" BOOLEAN DEFAULT true,
ADD COLUMN     "showUploadDate" BOOLEAN DEFAULT true,
ADD COLUMN     "showVideoTitle" BOOLEAN DEFAULT true,
ADD COLUMN     "useOriginalProgressBar" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "PendingVideo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "muxUploadId" TEXT,
    "muxAssetId" TEXT,
    "organizationId" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "tags" TEXT[],

    CONSTRAINT "PendingVideo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PendingVideo" ADD CONSTRAINT "PendingVideo_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
