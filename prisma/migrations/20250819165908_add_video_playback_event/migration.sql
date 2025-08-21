-- CreateTable
CREATE TABLE "VideoPlaybackEvent" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "clientId" TEXT,
    "eventType" TEXT NOT NULL,
    "currentTime" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoPlaybackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoPlaybackEvent_videoId_createdAt_idx" ON "VideoPlaybackEvent"("videoId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoPlaybackEvent_videoId_sessionId_idx" ON "VideoPlaybackEvent"("videoId", "sessionId");

-- CreateIndex
CREATE INDEX "VideoPlaybackEvent_eventType_idx" ON "VideoPlaybackEvent"("eventType");

-- AddForeignKey
ALTER TABLE "VideoPlaybackEvent" ADD CONSTRAINT "VideoPlaybackEvent_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
