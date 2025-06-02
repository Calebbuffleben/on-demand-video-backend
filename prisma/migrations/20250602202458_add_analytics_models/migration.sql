-- AlterTable
ALTER TABLE "VideoAnalytics" ALTER COLUMN "views" SET DEFAULT 0,
ALTER COLUMN "watchTime" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "VideoAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
    "retention" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAnalyticsHourly" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAnalyticsHourly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoViewerStats" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "watchTime" INTEGER NOT NULL DEFAULT 0,
    "lastWatched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoViewerStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsCache" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAnalyticsDaily_date_idx" ON "VideoAnalyticsDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAnalyticsDaily_videoId_date_key" ON "VideoAnalyticsDaily"("videoId", "date");

-- CreateIndex
CREATE INDEX "VideoAnalyticsHourly_timestamp_idx" ON "VideoAnalyticsHourly"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAnalyticsHourly_videoId_timestamp_key" ON "VideoAnalyticsHourly"("videoId", "timestamp");

-- CreateIndex
CREATE INDEX "VideoViewerStats_viewerId_idx" ON "VideoViewerStats"("viewerId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoViewerStats_videoId_viewerId_key" ON "VideoViewerStats"("videoId", "viewerId");

-- CreateIndex
CREATE INDEX "AnalyticsCache_expiresAt_idx" ON "AnalyticsCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsCache_organizationId_cacheKey_key" ON "AnalyticsCache"("organizationId", "cacheKey");

-- CreateIndex
CREATE INDEX "Organization_clerkId_idx" ON "Organization"("clerkId");

-- AddForeignKey
ALTER TABLE "VideoAnalyticsDaily" ADD CONSTRAINT "VideoAnalyticsDaily_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoAnalytics"("videoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAnalyticsHourly" ADD CONSTRAINT "VideoAnalyticsHourly_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoAnalytics"("videoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoViewerStats" ADD CONSTRAINT "VideoViewerStats_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "VideoAnalytics"("videoId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsCache" ADD CONSTRAINT "AnalyticsCache_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
