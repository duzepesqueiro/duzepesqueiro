DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sales_orders'
      AND column_name = 'userId'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "sales_orders" ALTER COLUMN "userId" DROP NOT NULL;
  END IF;
END $$;

DO $$
DECLARE
  constraint_oid oid;
  constraint_def text;
BEGIN
  SELECT oid, pg_get_constraintdef(oid)
  INTO constraint_oid, constraint_def
  FROM pg_constraint
  WHERE conname = 'sales_orders_userId_fkey';

  IF constraint_oid IS NULL THEN
    ALTER TABLE "sales_orders"
      ADD CONSTRAINT "sales_orders_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  ELSE
    IF position('ON DELETE CASCADE' IN constraint_def) = 0 OR position('ON UPDATE CASCADE' IN constraint_def) = 0 THEN
      ALTER TABLE "sales_orders" DROP CONSTRAINT "sales_orders_userId_fkey";
      ALTER TABLE "sales_orders"
        ADD CONSTRAINT "sales_orders_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
