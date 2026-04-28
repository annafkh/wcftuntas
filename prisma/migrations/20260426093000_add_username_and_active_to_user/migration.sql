ALTER TABLE "User"
ADD COLUMN "username" TEXT,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "User"
SET "username" = LOWER(
  REGEXP_REPLACE(SPLIT_PART("email", '@', 1), '[^a-zA-Z0-9._-]', '', 'g')
) || '_' || SUBSTRING("id", 1, 6)
WHERE "username" IS NULL;

ALTER TABLE "User"
ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
