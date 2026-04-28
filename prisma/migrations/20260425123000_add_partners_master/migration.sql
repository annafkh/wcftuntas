CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Partner_name_key" ON "Partner"("name");

ALTER TABLE "User" ADD COLUMN "partnerId" TEXT;

INSERT INTO "Partner" ("id", "name", "description", "createdAt", "updatedAt")
VALUES
  ('partner_internal_wcf', 'Mitra Internal PT wcf', 'Mitra awal hasil migrasi pengguna lama.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "User"
SET
  "partnerId" = 'partner_internal_wcf'
WHERE "partnerId" IS NULL;

ALTER TABLE "User" ADD CONSTRAINT "User_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
