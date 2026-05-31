-- AlterTable
ALTER TABLE "Detection" ADD COLUMN     "bbox" JSONB,
ADD COLUMN     "endTime" DECIMAL(10,2),
ADD COLUMN     "isIndependent" "IndependentStatus" NOT NULL DEFAULT 'UNDETERMINED',
ADD COLUMN     "relatedDetectionId" TEXT,
ADD COLUMN     "reviewerId" TEXT,
ADD COLUMN     "startTime" DECIMAL(10,2),
ADD COLUMN     "timestampSeconds" DECIMAL(10,2),
ADD COLUMN     "validatedSpeciesId" TEXT;

-- CreateIndex
CREATE INDEX "Detection_validatedSpeciesId_idx" ON "Detection"("validatedSpeciesId");

-- CreateIndex
CREATE INDEX "Detection_reviewerId_idx" ON "Detection"("reviewerId");

-- CreateIndex
CREATE INDEX "Detection_relatedDetectionId_idx" ON "Detection"("relatedDetectionId");

-- AddForeignKey
ALTER TABLE "Detection" ADD CONSTRAINT "Detection_validatedSpeciesId_fkey" FOREIGN KEY ("validatedSpeciesId") REFERENCES "Species"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detection" ADD CONSTRAINT "Detection_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Detection" ADD CONSTRAINT "Detection_relatedDetectionId_fkey" FOREIGN KEY ("relatedDetectionId") REFERENCES "Detection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
