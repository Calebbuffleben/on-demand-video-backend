-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "soundControlColor" TEXT DEFAULT '#FFFFFF',
ADD COLUMN     "soundControlOpacity" DOUBLE PRECISION DEFAULT 0.8,
ADD COLUMN     "soundControlSize" INTEGER DEFAULT 64,
ADD COLUMN     "soundControlText" TEXT DEFAULT 'Sound';
