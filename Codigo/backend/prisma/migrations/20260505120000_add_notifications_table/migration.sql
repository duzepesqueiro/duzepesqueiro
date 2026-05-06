DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationChannel') THEN
    CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationStatus') THEN
    CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "recipient_user_id" TEXT NOT NULL,
  "source" VARCHAR(80) NOT NULL,
  "event_key" VARCHAR(120) NOT NULL,
  "dedup_key" VARCHAR(180),
  "title" VARCHAR(160) NOT NULL,
  "message" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'INFO',
  "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "payload" JSONB,
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uk_notifications_dedup_key" ON "notifications"("dedup_key");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_status_created" ON "notifications"("recipient_user_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_user_created" ON "notifications"("recipient_user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notifications_event_created" ON "notifications"("event_key", "created_at" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_recipient_user_id_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_recipient_user_id_fkey"
      FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
