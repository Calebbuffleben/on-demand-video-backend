/*
  Warnings:

  - You are about to drop the column `cloudflareAccountId` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `cloudflareApiToken` on the `Organization` table. All the data in the column will be lost.
  - You are about to drop the column `cloudflareId` on the `Video` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "cloudflareAccountId",
DROP COLUMN "cloudflareApiToken";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "cloudflareId";
