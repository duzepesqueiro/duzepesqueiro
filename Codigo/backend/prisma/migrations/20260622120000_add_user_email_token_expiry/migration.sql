ALTER TABLE "user_emails"
ADD COLUMN IF NOT EXISTS "token_expires_at" TIMESTAMP(3);

