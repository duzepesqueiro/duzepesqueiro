CREATE TABLE IF NOT EXISTS "event_images" (
  "id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "image_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_images_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "event_images_event_id_idx" ON "event_images"("event_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_images_event_id_fkey'
  ) THEN
    ALTER TABLE "event_images"
      ADD CONSTRAINT "event_images_event_id_fkey"
      FOREIGN KEY ("event_id") REFERENCES "events"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
