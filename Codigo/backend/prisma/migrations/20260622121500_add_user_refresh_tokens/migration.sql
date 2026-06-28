CREATE TABLE IF NOT EXISTS "user_refresh_tokens" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "replaced_by_id" TEXT,
  CONSTRAINT "user_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_refresh_tokens_token_hash_key"
ON "user_refresh_tokens"("token_hash");

CREATE INDEX IF NOT EXISTS "user_refresh_tokens_user_id_idx"
ON "user_refresh_tokens"("user_id");

CREATE INDEX IF NOT EXISTS "user_refresh_tokens_expires_at_idx"
ON "user_refresh_tokens"("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_refresh_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE "user_refresh_tokens"
      ADD CONSTRAINT "user_refresh_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_refresh_tokens_replaced_by_id_fkey'
  ) THEN
    ALTER TABLE "user_refresh_tokens"
      ADD CONSTRAINT "user_refresh_tokens_replaced_by_id_fkey"
      FOREIGN KEY ("replaced_by_id") REFERENCES "user_refresh_tokens"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

