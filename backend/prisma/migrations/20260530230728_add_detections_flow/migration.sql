/*
  Warnings:

  - Added the required column `projectId` to the `Detection` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Detection" ADD COLUMN     "aiConfidence" DECIMAL(5,4),
ADD COLUMN     "aiSpecies" TEXT,
ADD COLUMN     "cameraId" TEXT,
ADD COLUMN     "detectedAt" TIMESTAMP(3),
ADD COLUMN     "framePath" TEXT,
ADD COLUMN     "hour" INTEGER,
ADD COLUMN     "month" INTEGER,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "timestampVideo" TEXT;

-- CreateIndex
CREATE INDEX "Detection_projectId_idx" ON "Detection"("projectId");

-- CreateIndex
CREATE INDEX "Detection_cameraId_idx" ON "Detection"("cameraId");

-- CreateIndex
CREATE INDEX "Detection_aiSpecies_idx" ON "Detection"("aiSpecies");

-- CreateIndex
CREATE INDEX "Detection_aiConfidence_idx" ON "Detection"("aiConfidence");

-- AddForeignKey
ALTER TABLE "Detection" ADD CONSTRAINT "Detection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detection" ADD CONSTRAINT "Detection_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE SET NULL ON UPDATE CASCADE;
