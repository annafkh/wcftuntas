CREATE TABLE "MasterArea" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterArea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MasterArea_name_key" ON "MasterArea"("name");

ALTER TABLE "Task"
ADD COLUMN "areaId" TEXT;

CREATE INDEX "Task_areaId_idx" ON "Task"("areaId");

ALTER TABLE "Task"
ADD CONSTRAINT "Task_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "MasterArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
