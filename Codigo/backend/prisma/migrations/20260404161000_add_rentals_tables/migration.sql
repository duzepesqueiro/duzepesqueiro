DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RentalStatus') THEN
    CREATE TYPE "RentalStatus" AS ENUM ('PENDING', 'ACTIVE', 'RETURNED', 'OVERDUE', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RentalOrigin') THEN
    CREATE TYPE "RentalOrigin" AS ENUM ('ONLINE', 'WALK_IN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ItemCondition') THEN
    CREATE TYPE "ItemCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RentalPeriod') THEN
    CREATE TYPE "RentalPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "rentals" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "origin" "RentalOrigin" NOT NULL,
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "totalAmount" DECIMAL(12, 2) NOT NULL,
  "rentalDate" DATE NOT NULL,
  "returnDate" DATE NOT NULL,
  "periodType" "RentalPeriod" NOT NULL DEFAULT 'DAILY',
  "periodValue" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "paymentMethod" TEXT,
  "paymentId" TEXT,
  "paidAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rental_items" (
  "id" TEXT NOT NULL,
  "rentalId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12, 2) NOT NULL,
  "subtotal" DECIMAL(12, 2) NOT NULL,
  "checkOutAt" TIMESTAMP(3),
  "checkInAt" TIMESTAMP(3),
  "status" "RentalStatus" NOT NULL DEFAULT 'PENDING',
  "returnCondition" "ItemCondition",
  "conditionNotes" TEXT,
  "plannedDuration" INTEGER,
  "actualDuration" INTEGER,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rental_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rental_carts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scheduledDate" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rental_carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rental_cart_items" (
  "id" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rental_cart_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rental_audit_logs" (
  "id" TEXT NOT NULL,
  "rentalId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rental_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rental_carts_userId_key" ON "rental_carts"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "rental_cart_items_cartId_productId_key" ON "rental_cart_items"("cartId", "productId");

CREATE INDEX IF NOT EXISTS "rentals_userId_rentalDate_idx" ON "rentals"("userId", "rentalDate");
CREATE INDEX IF NOT EXISTS "rentals_paymentStatus_idx" ON "rentals"("paymentStatus");
CREATE INDEX IF NOT EXISTS "rentals_origin_idx" ON "rentals"("origin");
CREATE INDEX IF NOT EXISTS "rentals_rentalDate_idx" ON "rentals"("rentalDate");
CREATE INDEX IF NOT EXISTS "rentals_deletedAt_idx" ON "rentals"("deletedAt");
CREATE INDEX IF NOT EXISTS "rentals_paymentStatus_rentalDate_idx" ON "rentals"("paymentStatus", "rentalDate");
CREATE INDEX IF NOT EXISTS "rentals_userId_deletedAt_idx" ON "rentals"("userId", "deletedAt");

CREATE INDEX IF NOT EXISTS "rental_items_rentalId_idx" ON "rental_items"("rentalId");
CREATE INDEX IF NOT EXISTS "rental_items_productId_idx" ON "rental_items"("productId");
CREATE INDEX IF NOT EXISTS "rental_items_status_idx" ON "rental_items"("status");
CREATE INDEX IF NOT EXISTS "rental_items_checkOutAt_idx" ON "rental_items"("checkOutAt");
CREATE INDEX IF NOT EXISTS "rental_items_rentalId_status_idx" ON "rental_items"("rentalId", "status");
CREATE INDEX IF NOT EXISTS "rental_items_deletedAt_idx" ON "rental_items"("deletedAt");
CREATE INDEX IF NOT EXISTS "rental_items_status_checkOutAt_idx" ON "rental_items"("status", "checkOutAt");

CREATE INDEX IF NOT EXISTS "rental_carts_userId_idx" ON "rental_carts"("userId");
CREATE INDEX IF NOT EXISTS "rental_cart_items_cartId_idx" ON "rental_cart_items"("cartId");
CREATE INDEX IF NOT EXISTS "rental_cart_items_productId_idx" ON "rental_cart_items"("productId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rentals_userId_fkey'
  ) THEN
    ALTER TABLE "rentals"
      ADD CONSTRAINT "rentals_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_items_rentalId_fkey'
  ) THEN
    ALTER TABLE "rental_items"
      ADD CONSTRAINT "rental_items_rentalId_fkey"
      FOREIGN KEY ("rentalId") REFERENCES "rentals"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_items_productId_fkey'
  ) THEN
    ALTER TABLE "rental_items"
      ADD CONSTRAINT "rental_items_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "produtos"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_carts_userId_fkey'
  ) THEN
    ALTER TABLE "rental_carts"
      ADD CONSTRAINT "rental_carts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_cart_items_cartId_fkey'
  ) THEN
    ALTER TABLE "rental_cart_items"
      ADD CONSTRAINT "rental_cart_items_cartId_fkey"
      FOREIGN KEY ("cartId") REFERENCES "rental_carts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_cart_items_productId_fkey'
  ) THEN
    ALTER TABLE "rental_cart_items"
      ADD CONSTRAINT "rental_cart_items_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "produtos"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_audit_logs_rentalId_fkey'
  ) THEN
    ALTER TABLE "rental_audit_logs"
      ADD CONSTRAINT "rental_audit_logs_rentalId_fkey"
      FOREIGN KEY ("rentalId") REFERENCES "rentals"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_audit_logs_userId_fkey'
  ) THEN
    ALTER TABLE "rental_audit_logs"
      ADD CONSTRAINT "rental_audit_logs_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
