CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReviewDomain') THEN
    CREATE TYPE "ReviewDomain" AS ENUM ('SALES', 'RENTAL', 'HOSTING', 'EVENT');
  END IF;
END $$;

ALTER TABLE "hosting_chalets"
  ADD COLUMN IF NOT EXISTS "average_rating" DECIMAL(5, 2) NOT NULL DEFAULT 0;

ALTER TABLE "hosting_chalets"
  ADD COLUMN IF NOT EXISTS "reviews_count" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" TEXT NOT NULL,
  "domain" "ReviewDomain" NOT NULL,
  "subject_id" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "target_name" VARCHAR(255),
  "user_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "review_aggregates" (
  "id" TEXT NOT NULL,
  "domain" "ReviewDomain" NOT NULL,
  "target_id" TEXT NOT NULL,
  "average_rating" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  "reviews_count" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "review_aggregates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uk_reviews_domain_subject" ON "reviews"("domain", "subject_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_domain_target_created" ON "reviews"("domain", "target_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_reviews_user_created" ON "reviews"("user_id", "created_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "uk_review_aggregates_domain_target" ON "review_aggregates"("domain", "target_id");
CREATE INDEX IF NOT EXISTS "idx_review_aggregates_domain_target" ON "review_aggregates"("domain", "target_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_user_id_fkey'
  ) THEN
    ALTER TABLE "reviews"
      ADD CONSTRAINT "reviews_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "reviews" (
  "id",
  "domain",
  "subject_id",
  "target_id",
  "target_name",
  "user_id",
  "rating",
  "comment",
  "created_at",
  "updated_at"
)
SELECT
  rr."id",
  'HOSTING',
  rr."reservation_id",
  rr."chale_id",
  c."nome",
  COALESCE(rr."user_id", r."user_id"),
  rr."rating",
  rr."comment",
  rr."created_at",
  rr."updated_at"
FROM "hosting_reservation_reviews" rr
JOIN "hosting_reservations" r ON r."id" = rr."reservation_id"
JOIN "hosting_chalets" c ON c."id" = rr."chale_id"
WHERE COALESCE(rr."user_id", r."user_id") IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "reviews" x
    WHERE x."domain" = 'HOSTING' AND x."subject_id" = rr."reservation_id"
  );

INSERT INTO "review_aggregates" (
  "id",
  "domain",
  "target_id",
  "average_rating",
  "reviews_count",
  "updated_at"
)
SELECT
  gen_random_uuid()::text,
  r."domain",
  r."target_id",
  ROUND(AVG(r."rating")::numeric, 2)::numeric(5, 2),
  COUNT(*)::int,
  CURRENT_TIMESTAMP
FROM "reviews" r
GROUP BY r."domain", r."target_id"
ON CONFLICT ("domain", "target_id") DO NOTHING;

UPDATE "hosting_chalets" c
SET
  "average_rating" = a."average_rating",
  "reviews_count" = a."reviews_count",
  "updated_at" = CURRENT_TIMESTAMP
FROM "review_aggregates" a
WHERE a."domain" = 'HOSTING'
  AND a."target_id" = c."id";

