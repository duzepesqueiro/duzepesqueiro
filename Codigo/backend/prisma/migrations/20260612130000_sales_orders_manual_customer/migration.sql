ALTER TABLE "sales_orders"
  ADD COLUMN IF NOT EXISTS "customerName" TEXT;

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
