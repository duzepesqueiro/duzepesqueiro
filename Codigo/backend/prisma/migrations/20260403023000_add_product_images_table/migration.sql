CREATE TABLE IF NOT EXISTS "produto_imagens" (
  "id" TEXT NOT NULL,
  "produto_id" TEXT NOT NULL,
  "image_url" VARCHAR(1000) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "produto_imagens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "produto_imagens_produto_id_created_at_idx"
  ON "produto_imagens"("produto_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produto_imagens_produto_id_fkey'
  ) THEN
    ALTER TABLE "produto_imagens"
      ADD CONSTRAINT "produto_imagens_produto_id_fkey"
      FOREIGN KEY ("produto_id") REFERENCES "produtos"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
