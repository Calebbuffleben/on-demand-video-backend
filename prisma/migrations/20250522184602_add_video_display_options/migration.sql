-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "playButtonBgColor" TEXT DEFAULT 'rgba(0,0,0,0.6)',
ADD COLUMN     "playButtonColor" TEXT DEFAULT '#FFFFFF',
ADD COLUMN     "playButtonSize" INTEGER DEFAULT 60,
ADD COLUMN     "progressBarColor" TEXT DEFAULT '#3B82F6',
ADD COLUMN     "progressEasing" DOUBLE PRECISION DEFAULT 0.25;
