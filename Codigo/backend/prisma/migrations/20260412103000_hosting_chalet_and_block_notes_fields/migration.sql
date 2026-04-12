ALTER TABLE "hosting_chalets"
  ADD COLUMN IF NOT EXISTS "comodidades" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "hosting_chalets"
  ADD COLUMN IF NOT EXISTS "comodos" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "hosting_chalets"
  ADD COLUMN IF NOT EXISTS "observacoes" TEXT;

ALTER TABLE "hosting_chalet_blocks"
  ADD COLUMN IF NOT EXISTS "observacoes" TEXT;
