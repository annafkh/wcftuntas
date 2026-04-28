-- AlterTable
ALTER TABLE "TaskTemplate" ADD COLUMN     "areaId" TEXT;

-- CreateIndex
CREATE INDEX "TaskTemplate_areaId_idx" ON "TaskTemplate"("areaId");

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "MasterArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
