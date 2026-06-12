DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalesOrderStatus') THEN
    CREATE TYPE "SalesOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'PAID'
  ) THEN
    ALTER TYPE "PaymentStatus" ADD VALUE 'PAID';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "sales_orders" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "SalesOrderStatus" NOT NULL DEFAULT 'PENDING',
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "totalAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "note" TEXT,
  "paymentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sales_order_items" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12, 2) NOT NULL,
  "subtotal" DECIMAL(12, 2) NOT NULL,
  "nameSnapshot" VARCHAR(255) NOT NULL,
  "imageSnapshot" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sales_orders_userId_createdAt_idx" ON "sales_orders"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "sales_orders_status_idx" ON "sales_orders"("status");
CREATE INDEX IF NOT EXISTS "sales_orders_paymentStatus_idx" ON "sales_orders"("paymentStatus");

CREATE INDEX IF NOT EXISTS "sales_order_items_orderId_idx" ON "sales_order_items"("orderId");
CREATE INDEX IF NOT EXISTS "sales_order_items_productId_idx" ON "sales_order_items"("productId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_orders_userId_fkey'
  ) THEN
    ALTER TABLE "sales_orders"
      ADD CONSTRAINT "sales_orders_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_orderId_fkey'
  ) THEN
    ALTER TABLE "sales_order_items"
      ADD CONSTRAINT "sales_order_items_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "sales_orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_order_items_productId_fkey'
  ) THEN
    ALTER TABLE "sales_order_items"
      ADD CONSTRAINT "sales_order_items_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "produtos"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
