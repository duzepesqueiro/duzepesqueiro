DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventStatus') THEN
    CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UPCOMING');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventRegistrationStatus') THEN
    CREATE TYPE "EventRegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'PAID');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventPaymentStatus') THEN
    CREATE TYPE "EventPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KpiType') THEN
    CREATE TYPE "KpiType" AS ENUM (
      'ACTIVE_EVENTS',
      'REGISTERED_PARTICIPANTS',
      'REGISTRATION_PERCENTAGE',
      'SOLD_OUT_EVENTS'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "events" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "rules" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "image_key" TEXT NOT NULL,
  "total_slots" INTEGER NOT NULL,
  "available_slots" INTEGER NOT NULL,
  "event_date" TIMESTAMP(3) NOT NULL,
  "event_time" TEXT NOT NULL,
  "status" "EventStatus" NOT NULL DEFAULT 'SCHEDULED',
  "price" DECIMAL(10, 2),
  "is_paid" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "event_registrations" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "status" "EventRegistrationStatus" NOT NULL DEFAULT 'PENDING',
  "order_id" TEXT,
  "payment_status" "EventPaymentStatus",
  "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "event_kpi_goals" (
  "id" TEXT NOT NULL,
  "kpi_type" "KpiType" NOT NULL,
  "target_value" DECIMAL(10, 2) NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "event_kpi_goals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "event_registrations_user_id_event_id_key"
ON "event_registrations"("user_id", "event_id");

CREATE UNIQUE INDEX IF NOT EXISTS "event_kpi_goals_kpi_type_month_year_key"
ON "event_kpi_goals"("kpi_type", "month", "year");

CREATE INDEX IF NOT EXISTS "events_event_date_idx" ON "events"("event_date");
CREATE INDEX IF NOT EXISTS "events_status_idx" ON "events"("status");
CREATE INDEX IF NOT EXISTS "event_registrations_user_id_idx" ON "event_registrations"("user_id");
CREATE INDEX IF NOT EXISTS "event_registrations_event_id_idx" ON "event_registrations"("event_id");
CREATE INDEX IF NOT EXISTS "event_registrations_status_idx" ON "event_registrations"("status");
CREATE INDEX IF NOT EXISTS "event_kpi_goals_kpi_type_month_year_idx" ON "event_kpi_goals"("kpi_type", "month", "year");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_registrations_user_id_fkey'
  ) THEN
    ALTER TABLE "event_registrations"
      ADD CONSTRAINT "event_registrations_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_registrations_event_id_fkey'
  ) THEN
    ALTER TABLE "event_registrations"
      ADD CONSTRAINT "event_registrations_event_id_fkey"
      FOREIGN KEY ("event_id") REFERENCES "events"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
