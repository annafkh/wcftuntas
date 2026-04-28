DO $$
DECLARE
  has_legacy_shift_type boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'ShiftType'
      AND e.enumlabel IN ('malam', 'libur')
  )
  INTO has_legacy_shift_type;

  IF NOT has_legacy_shift_type THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM "Task" WHERE "shift"::text = 'libur') THEN
    RAISE EXCEPTION 'Migration blocked: Task.shift still contains ''libur''. Update those rows before applying this migration.';
  END IF;

  IF EXISTS (SELECT 1 FROM "ShiftSchedule" WHERE "shift"::text = 'libur') THEN
    RAISE EXCEPTION 'Migration blocked: ShiftSchedule.shift still contains ''libur''. Update those rows before applying this migration.';
  END IF;

  EXECUTE 'ALTER TYPE "ShiftType" RENAME TO "ShiftType_old"';
  EXECUTE 'CREATE TYPE "ShiftType" AS ENUM (''pagi'', ''middle'', ''siang'')';

  EXECUTE '
    ALTER TABLE "Task"
      ALTER COLUMN "shift" DROP DEFAULT,
      ALTER COLUMN "shift" TYPE "ShiftType"
      USING (
        CASE
          WHEN "shift"::text = ''malam'' THEN ''middle''
          ELSE "shift"::text
        END
      )::"ShiftType",
      ALTER COLUMN "shift" SET DEFAULT ''pagi''
  ';

  EXECUTE '
    ALTER TABLE "ShiftSchedule"
      ALTER COLUMN "shift" TYPE "ShiftType"
      USING (
        CASE
          WHEN "shift"::text = ''malam'' THEN ''middle''
          ELSE "shift"::text
        END
      )::"ShiftType"
  ';

  EXECUTE 'DROP TYPE "ShiftType_old"';
END $$;
