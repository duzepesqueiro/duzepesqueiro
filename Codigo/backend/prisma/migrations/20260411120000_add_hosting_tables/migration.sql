DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChaleType') THEN
    CREATE TYPE "ChaleType" AS ENUM ('STANDARD', 'DELUXE', 'SUITE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChaleStatus') THEN
    CREATE TYPE "ChaleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'CLEANING', 'ADMIN', 'INTERDICTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReservationStatus') THEN
    CREATE TYPE "ReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'OCCUPIED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HostingReservationOrigin') THEN
    CREATE TYPE "HostingReservationOrigin" AS ENUM ('ONLINE', 'WALK_IN', 'ADMIN');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BlockReason') THEN
    CREATE TYPE "BlockReason" AS ENUM ('MAINTENANCE', 'CLEANING', 'ADMIN', 'INTERDICTION');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PriceRuleType') THEN
    CREATE TYPE "PriceRuleType" AS ENUM ('SEASON', 'WEEKEND', 'HOLIDAY', 'DISCOUNT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReservationPaymentType') THEN
    CREATE TYPE "ReservationPaymentType" AS ENUM ('RESERVATION', 'CANCELLATION_FEE', 'ADDITIONAL_FEE', 'REFUND');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "hosting_chalets" (
  "id" TEXT NOT NULL,
  "codigo" VARCHAR(50) NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "descricao" TEXT,
  "tipo_unidade" "ChaleType" NOT NULL,
  "status" "ChaleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "preco_base" DECIMAL(12, 2) NOT NULL,
  "max_hospedes" INTEGER NOT NULL DEFAULT 2,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "hosting_chalets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hosting_amenities" (
  "id" TEXT NOT NULL,
  "nome" VARCHAR(120) NOT NULL,
  "descricao" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hosting_amenities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hosting_chalet_images" (
  "id" TEXT NOT NULL,
  "chale_id" TEXT NOT NULL,
  "image_url" VARCHAR(1000) NOT NULL,
  "image_key" VARCHAR(500) NOT NULL,
  "file_size_bytes" INTEGER NOT NULL,
  "mime_type" VARCHAR(120),
  "position" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hosting_chalet_images_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hosting_chalet_images_file_size_check" CHECK ("file_size_bytes" <= 10485760)
);

CREATE TABLE IF NOT EXISTS "hosting_chalet_amenities" (
  "id" TEXT NOT NULL,
  "chale_id" TEXT NOT NULL,
  "comodidade_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hosting_chalet_amenities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hosting_pricing_rules" (
  "id" TEXT NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "tipo_regra" "PriceRuleType" NOT NULL,
  "percentual" DECIMAL(5, 2) NOT NULL,
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE NOT NULL,
  "aplica_todos" BOOLEAN NOT NULL DEFAULT FALSE,
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "criado_por" TEXT,
  "atualizado_por" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "hosting_pricing_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hosting_pricing_rule_chalets" (
  "id" TEXT NOT NULL,
  "regra_id" TEXT NOT NULL,
  "chale_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hosting_pricing_rule_chalets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hosting_reservations" (
  "id" TEXT NOT NULL,
  "codigo" VARCHAR(20) NOT NULL,
  "chale_id" TEXT NOT NULL,
  "user_id" TEXT,
  "regra_preco_id" TEXT,
  "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
  "origem" "HostingReservationOrigin" NOT NULL DEFAULT 'ONLINE',
  "nome_hospede" VARCHAR(255) NOT NULL,
  "email_hospede" VARCHAR(255),
  "telefone_hospede" VARCHAR(30),
  "data_checkin" DATE NOT NULL,
  "data_checkout" DATE NOT NULL,
  "adultos" INTEGER NOT NULL DEFAULT 1,
  "criancas" INTEGER NOT NULL DEFAULT 0,
  "valor_base" DECIMAL(12, 2) NOT NULL,
  "valor_desconto" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "valor_acrescimo" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "valor_total" DECIMAL(12, 2) NOT NULL,
  "status_pagamento" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "metodo_pagamento" TEXT,
  "payment_id" TEXT,
  "pago_em" TIMESTAMP(3),
  "checkin_realizado_em" TIMESTAMP(3),
  "checkout_realizado_em" TIMESTAMP(3),
  "cancelado_em" TIMESTAMP(3),
  "motivo_cancelamento" TEXT,
  "observacoes" TEXT,
  "criado_por" TEXT,
  "atualizado_por" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "hosting_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hosting_reservations_data_periodo_check" CHECK ("data_checkout" > "data_checkin")
);

CREATE TABLE IF NOT EXISTS "hosting_chalet_blocks" (
  "id" TEXT NOT NULL,
  "chale_id" TEXT NOT NULL,
  "data_inicio" DATE NOT NULL,
  "data_fim" DATE NOT NULL,
  "motivo" "BlockReason",
  "ativo" BOOLEAN NOT NULL DEFAULT TRUE,
  "criado_por" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hosting_chalet_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hosting_chalet_blocks_data_periodo_check" CHECK ("data_fim" >= "data_inicio")
);

CREATE TABLE IF NOT EXISTS "hosting_chalet_availability" (
  "id" TEXT NOT NULL,
  "chale_id" TEXT NOT NULL,
  "reference_date" DATE NOT NULL,
  "status" "ChaleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "reservation_id" TEXT,
  "block_id" TEXT,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hosting_chalet_availability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hosting_reservation_vouchers" (
  "id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "qr_code" TEXT NOT NULL,
  "arrival_instructions" TEXT,
  "complex_contacts" TEXT,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_by_email" BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT "hosting_reservation_vouchers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hosting_reservation_reviews" (
  "id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "chale_id" TEXT NOT NULL,
  "user_id" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hosting_reservation_reviews_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hosting_reservation_reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5)
);

CREATE TABLE IF NOT EXISTS "hosting_audit_logs" (
  "id" TEXT NOT NULL,
  "reserva_id" TEXT,
  "chale_id" TEXT,
  "regra_preco_id" TEXT,
  "user_id" TEXT,
  "acao" TEXT NOT NULL,
  "valor_anterior" JSONB,
  "valor_novo" JSONB,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hosting_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "hosting_chalets_codigo_key" ON "hosting_chalets"("codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "hosting_amenities_nome_key" ON "hosting_amenities"("nome");
CREATE UNIQUE INDEX IF NOT EXISTS "hosting_chalet_images_chale_id_position_key" ON "hosting_chalet_images"("chale_id", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "hosting_chalet_amenities_chale_id_comodidade_id_key" ON "hosting_chalet_amenities"("chale_id", "comodidade_id");
CREATE UNIQUE INDEX IF NOT EXISTS "hosting_pricing_rule_chalets_chale_id_key" ON "hosting_pricing_rule_chalets"("chale_id");
CREATE UNIQUE INDEX IF NOT EXISTS "hosting_pricing_rule_chalets_regra_id_chale_id_key" ON "hosting_pricing_rule_chalets"("regra_id", "chale_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_reservas_codigo" ON "hosting_reservations"("codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "hosting_chalet_availability_chale_id_reference_date_key" ON "hosting_chalet_availability"("chale_id", "reference_date");
CREATE UNIQUE INDEX IF NOT EXISTS "hosting_reservation_reviews_reservation_id_key" ON "hosting_reservation_reviews"("reservation_id");

CREATE INDEX IF NOT EXISTS "hosting_chalets_status_deleted_at_idx" ON "hosting_chalets"("status", "deleted_at");
CREATE INDEX IF NOT EXISTS "hosting_chalets_ativo_deleted_at_idx" ON "hosting_chalets"("ativo", "deleted_at");
CREATE INDEX IF NOT EXISTS "hosting_chalets_tipo_unidade_idx" ON "hosting_chalets"("tipo_unidade");
CREATE INDEX IF NOT EXISTS "hosting_chalet_images_chale_id_created_at_idx" ON "hosting_chalet_images"("chale_id", "created_at");
CREATE INDEX IF NOT EXISTS "hosting_chalet_amenities_comodidade_id_idx" ON "hosting_chalet_amenities"("comodidade_id");
CREATE INDEX IF NOT EXISTS "idx_preco_regras_ativas" ON "hosting_pricing_rules"("ativo", "data_inicio", "data_fim");
CREATE INDEX IF NOT EXISTS "idx_preco_regras_datas" ON public."hosting_pricing_rules"("data_inicio", "data_fim");
CREATE INDEX IF NOT EXISTS "hosting_pricing_rules_deleted_at_idx" ON "hosting_pricing_rules"("deleted_at");
CREATE INDEX IF NOT EXISTS "hosting_pricing_rule_chalets_regra_id_idx" ON "hosting_pricing_rule_chalets"("regra_id");
CREATE INDEX IF NOT EXISTS "idx_reservas_status" ON "hosting_reservations"("status");
CREATE INDEX IF NOT EXISTS "idx_reservas_checkin_data" ON "hosting_reservations"("data_checkin");
CREATE INDEX IF NOT EXISTS "idx_reservas_chale_id" ON "hosting_reservations"("chale_id");
CREATE INDEX IF NOT EXISTS "idx_reservas_user_id" ON public."hosting_reservations"("user_id");
CREATE INDEX IF NOT EXISTS "idx_reservas_checkout_date" ON public."hosting_reservations"("data_checkout");
CREATE INDEX IF NOT EXISTS "idx_reservas_created_at" ON public."hosting_reservations"("created_at");
CREATE INDEX IF NOT EXISTS "hosting_reservations_chale_id_data_checkin_data_checkout_idx" ON "hosting_reservations"("chale_id", "data_checkin", "data_checkout");
CREATE INDEX IF NOT EXISTS "hosting_reservations_status_data_checkin_idx" ON "hosting_reservations"("status", "data_checkin");
CREATE INDEX IF NOT EXISTS "hosting_reservations_status_pagamento_data_checkin_idx" ON "hosting_reservations"("status_pagamento", "data_checkin");
CREATE INDEX IF NOT EXISTS "hosting_reservations_user_id_idx" ON "hosting_reservations"("user_id");
CREATE INDEX IF NOT EXISTS "hosting_reservations_deleted_at_idx" ON "hosting_reservations"("deleted_at");
CREATE INDEX IF NOT EXISTS "idx_bloqueios_datas" ON "hosting_chalet_blocks"("chale_id", "data_inicio", "data_fim");
CREATE INDEX IF NOT EXISTS "idx_bloqueios_chale_id" ON public."hosting_chalet_blocks"("chale_id");
CREATE INDEX IF NOT EXISTS "hosting_chalet_blocks_ativo_idx" ON "hosting_chalet_blocks"("ativo");
CREATE INDEX IF NOT EXISTS "hosting_chalet_availability_status_reference_date_idx" ON "hosting_chalet_availability"("status", "reference_date");
CREATE INDEX IF NOT EXISTS "hosting_reservation_vouchers_reservation_id_idx" ON "hosting_reservation_vouchers"("reservation_id");
CREATE INDEX IF NOT EXISTS "idx_avaliacoes_chale_id" ON "hosting_reservation_reviews"("chale_id");
CREATE INDEX IF NOT EXISTS "idx_avaliacoes_user_id" ON public."hosting_reservation_reviews"("user_id");
CREATE INDEX IF NOT EXISTS "hosting_reservation_reviews_user_id_idx" ON "hosting_reservation_reviews"("user_id");
CREATE INDEX IF NOT EXISTS "hosting_audit_logs_reserva_id_idx" ON "hosting_audit_logs"("reserva_id");
CREATE INDEX IF NOT EXISTS "hosting_audit_logs_chale_id_idx" ON "hosting_audit_logs"("chale_id");
CREATE INDEX IF NOT EXISTS "hosting_audit_logs_regra_preco_id_idx" ON "hosting_audit_logs"("regra_preco_id");
CREATE INDEX IF NOT EXISTS "hosting_audit_logs_user_id_idx" ON "hosting_audit_logs"("user_id");
CREATE INDEX IF NOT EXISTS "hosting_audit_logs_acao_idx" ON "hosting_audit_logs"("acao");
CREATE INDEX IF NOT EXISTS "hosting_audit_logs_created_at_idx" ON "hosting_audit_logs"("created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_chalet_images_chale_id_fkey'
  ) THEN
    ALTER TABLE "hosting_chalet_images"
      ADD CONSTRAINT "hosting_chalet_images_chale_id_fkey"
      FOREIGN KEY ("chale_id") REFERENCES "hosting_chalets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_chalet_amenities_chale_id_fkey'
  ) THEN
    ALTER TABLE "hosting_chalet_amenities"
      ADD CONSTRAINT "hosting_chalet_amenities_chale_id_fkey"
      FOREIGN KEY ("chale_id") REFERENCES "hosting_chalets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_chalet_amenities_comodidade_id_fkey'
  ) THEN
    ALTER TABLE "hosting_chalet_amenities"
      ADD CONSTRAINT "hosting_chalet_amenities_comodidade_id_fkey"
      FOREIGN KEY ("comodidade_id") REFERENCES "hosting_amenities"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_pricing_rules_criado_por_fkey'
  ) THEN
    ALTER TABLE "hosting_pricing_rules"
      ADD CONSTRAINT "hosting_pricing_rules_criado_por_fkey"
      FOREIGN KEY ("criado_por") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_pricing_rules_atualizado_por_fkey'
  ) THEN
    ALTER TABLE "hosting_pricing_rules"
      ADD CONSTRAINT "hosting_pricing_rules_atualizado_por_fkey"
      FOREIGN KEY ("atualizado_por") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_pricing_rule_chalets_regra_id_fkey'
  ) THEN
    ALTER TABLE "hosting_pricing_rule_chalets"
      ADD CONSTRAINT "hosting_pricing_rule_chalets_regra_id_fkey"
      FOREIGN KEY ("regra_id") REFERENCES "hosting_pricing_rules"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_pricing_rule_chalets_chale_id_fkey'
  ) THEN
    ALTER TABLE "hosting_pricing_rule_chalets"
      ADD CONSTRAINT "hosting_pricing_rule_chalets_chale_id_fkey"
      FOREIGN KEY ("chale_id") REFERENCES "hosting_chalets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservations_chale_id_fkey'
  ) THEN
    ALTER TABLE "hosting_reservations"
      ADD CONSTRAINT "hosting_reservations_chale_id_fkey"
      FOREIGN KEY ("chale_id") REFERENCES "hosting_chalets"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservations_user_id_fkey'
  ) THEN
    ALTER TABLE "hosting_reservations"
      ADD CONSTRAINT "hosting_reservations_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservations_regra_preco_id_fkey'
  ) THEN
    ALTER TABLE "hosting_reservations"
      ADD CONSTRAINT "hosting_reservations_regra_preco_id_fkey"
      FOREIGN KEY ("regra_preco_id") REFERENCES "hosting_pricing_rules"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservations_payment_id_fkey'
  ) THEN
    ALTER TABLE "hosting_reservations"
      ADD CONSTRAINT "hosting_reservations_payment_id_fkey"
      FOREIGN KEY ("payment_id") REFERENCES "payments"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservations_criado_por_fkey'
  ) THEN
    ALTER TABLE "hosting_reservations"
      ADD CONSTRAINT "hosting_reservations_criado_por_fkey"
      FOREIGN KEY ("criado_por") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservations_atualizado_por_fkey'
  ) THEN
    ALTER TABLE "hosting_reservations"
      ADD CONSTRAINT "hosting_reservations_atualizado_por_fkey"
      FOREIGN KEY ("atualizado_por") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_chalet_blocks_chale_id_fkey'
  ) THEN
    ALTER TABLE "hosting_chalet_blocks"
      ADD CONSTRAINT "hosting_chalet_blocks_chale_id_fkey"
      FOREIGN KEY ("chale_id") REFERENCES "hosting_chalets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_chalet_blocks_criado_por_fkey'
  ) THEN
    ALTER TABLE "hosting_chalet_blocks"
      ADD CONSTRAINT "hosting_chalet_blocks_criado_por_fkey"
      FOREIGN KEY ("criado_por") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_chalet_availability_chale_id_fkey'
  ) THEN
    ALTER TABLE "hosting_chalet_availability"
      ADD CONSTRAINT "hosting_chalet_availability_chale_id_fkey"
      FOREIGN KEY ("chale_id") REFERENCES "hosting_chalets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_chalet_availability_reservation_id_fkey'
  ) THEN
    ALTER TABLE "hosting_chalet_availability"
      ADD CONSTRAINT "hosting_chalet_availability_reservation_id_fkey"
      FOREIGN KEY ("reservation_id") REFERENCES "hosting_reservations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_chalet_availability_block_id_fkey'
  ) THEN
    ALTER TABLE "hosting_chalet_availability"
      ADD CONSTRAINT "hosting_chalet_availability_block_id_fkey"
      FOREIGN KEY ("block_id") REFERENCES "hosting_chalet_blocks"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservation_vouchers_reservation_id_fkey'
  ) THEN
    ALTER TABLE "hosting_reservation_vouchers"
      ADD CONSTRAINT "hosting_reservation_vouchers_reservation_id_fkey"
      FOREIGN KEY ("reservation_id") REFERENCES "hosting_reservations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservation_reviews_reservation_id_fkey'
  ) THEN
    ALTER TABLE "hosting_reservation_reviews"
      ADD CONSTRAINT "hosting_reservation_reviews_reservation_id_fkey"
      FOREIGN KEY ("reservation_id") REFERENCES "hosting_reservations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservation_reviews_chale_id_fkey'
  ) THEN
    ALTER TABLE "hosting_reservation_reviews"
      ADD CONSTRAINT "hosting_reservation_reviews_chale_id_fkey"
      FOREIGN KEY ("chale_id") REFERENCES "hosting_chalets"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservation_reviews_user_id_fkey'
  ) THEN
    ALTER TABLE "hosting_reservation_reviews"
      ADD CONSTRAINT "hosting_reservation_reviews_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_audit_logs_reserva_id_fkey'
  ) THEN
    ALTER TABLE "hosting_audit_logs"
      ADD CONSTRAINT "hosting_audit_logs_reserva_id_fkey"
      FOREIGN KEY ("reserva_id") REFERENCES "hosting_reservations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_audit_logs_chale_id_fkey'
  ) THEN
    ALTER TABLE "hosting_audit_logs"
      ADD CONSTRAINT "hosting_audit_logs_chale_id_fkey"
      FOREIGN KEY ("chale_id") REFERENCES "hosting_chalets"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_audit_logs_regra_preco_id_fkey'
  ) THEN
    ALTER TABLE "hosting_audit_logs"
      ADD CONSTRAINT "hosting_audit_logs_regra_preco_id_fkey"
      FOREIGN KEY ("regra_preco_id") REFERENCES "hosting_pricing_rules"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_audit_logs_user_id_fkey'
  ) THEN
    ALTER TABLE "hosting_audit_logs"
      ADD CONSTRAINT "hosting_audit_logs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION generate_reservation_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR LENGTH(TRIM(NEW.codigo)) = 0 THEN
    NEW.codigo := 'RES-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_chalet_status_by_reservation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'OCCUPIED' THEN
    UPDATE "hosting_chalets" SET "status" = 'OCCUPIED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = NEW.chale_id;
  ELSIF NEW.status = 'COMPLETED' THEN
    UPDATE "hosting_chalets" SET "status" = 'AVAILABLE', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = NEW.chale_id;
  ELSIF NEW.status = 'CANCELLED' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM "hosting_reservations" r
      WHERE r."chale_id" = NEW.chale_id
        AND r."id" <> NEW.id
        AND r."deleted_at" IS NULL
        AND r."status" IN ('PENDING', 'CONFIRMED', 'OCCUPIED')
        AND CURRENT_DATE BETWEEN r."data_checkin" AND r."data_checkout"
    ) THEN
      UPDATE "hosting_chalets" SET "status" = 'AVAILABLE', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = NEW.chale_id;
    END IF;
  ELSE
    UPDATE "hosting_chalets" SET "status" = 'RESERVED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = NEW.chale_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_chalet_images_limit()
RETURNS TRIGGER AS $$
DECLARE
  total_images INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_images
  FROM "hosting_chalet_images"
  WHERE "chale_id" = NEW.chale_id;

  IF TG_OP = 'UPDATE' AND OLD.chale_id = NEW.chale_id THEN
    total_images := total_images - 1;
  END IF;

  IF total_images >= 10 THEN
    RAISE EXCEPTION 'A chalet can have at most 10 images';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_daily_rate(p_chalet_id TEXT, p_reference_date DATE)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_base_price DECIMAL(12,2);
  v_adjusted_price DECIMAL(12,2);
  v_percentage DECIMAL(5,2);
  v_rule_type "PriceRuleType";
BEGIN
  SELECT "preco_base" INTO v_base_price
  FROM "hosting_chalets"
  WHERE "id" = p_chalet_id;

  v_adjusted_price := COALESCE(v_base_price, 0);

  SELECT pr."percentual", pr."tipo_regra"
    INTO v_percentage, v_rule_type
  FROM "hosting_pricing_rules" pr
  LEFT JOIN "hosting_pricing_rule_chalets" prc ON prc."regra_id" = pr."id"
  WHERE pr."ativo" = TRUE
    AND pr."deleted_at" IS NULL
    AND p_reference_date BETWEEN pr."data_inicio" AND pr."data_fim"
    AND (pr."aplica_todos" = TRUE OR prc."chale_id" = p_chalet_id)
    AND (
      pr."tipo_regra" <> 'WEEKEND'
      OR EXTRACT(DOW FROM p_reference_date) IN (0, 6)
    )
  ORDER BY pr."aplica_todos" ASC, pr."created_at" DESC
  LIMIT 1;

  IF v_percentage IS NOT NULL THEN
    IF v_rule_type = 'DISCOUNT' THEN
      v_adjusted_price := v_adjusted_price - (v_adjusted_price * v_percentage / 100.0);
    ELSE
      v_adjusted_price := v_adjusted_price + (v_adjusted_price * v_percentage / 100.0);
    END IF;
  END IF;

  RETURN GREATEST(v_adjusted_price, 0);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_total_reservation(
  p_chalet_id TEXT,
  p_checkin_date DATE,
  p_checkout_date DATE,
  p_guest_count INTEGER
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_total DECIMAL(12,2) := 0;
  v_date DATE;
BEGIN
  v_date := p_checkin_date;
  WHILE v_date < p_checkout_date LOOP
    v_total := v_total + calculate_daily_rate(p_chalet_id, v_date);
    v_date := v_date + 1;
  END LOOP;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verify_chalet_availability(
  p_chalet_id TEXT,
  p_checkin_date DATE,
  p_checkout_date DATE,
  p_exclude_reservation_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM "hosting_reservations" r
  WHERE r."chale_id" = p_chalet_id
    AND r."deleted_at" IS NULL
    AND r."status" IN ('PENDING', 'CONFIRMED', 'OCCUPIED')
    AND (p_exclude_reservation_id IS NULL OR r."id" <> p_exclude_reservation_id)
    AND daterange(r."data_checkin", r."data_checkout", '[)') && daterange(p_checkin_date, p_checkout_date, '[)');

  IF v_conflict_count > 0 THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO v_conflict_count
  FROM "hosting_chalet_blocks" b
  WHERE b."chale_id" = p_chalet_id
    AND b."ativo" = TRUE
    AND daterange(b."data_inicio", b."data_fim" + 1, '[)') && daterange(p_checkin_date, p_checkout_date, '[)');

  IF v_conflict_count > 0 THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_cancellation_penalty(
  p_total_amount DECIMAL(12,2),
  p_checkin_date DATE,
  p_cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_days_before INTEGER;
BEGIN
  v_days_before := p_checkin_date - DATE(p_cancelled_at);

  IF v_days_before >= 14 THEN
    RETURN 0;
  ELSIF v_days_before >= 7 THEN
    RETURN p_total_amount * 0.20;
  END IF;

  RETURN p_total_amount * 0.50;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_reserva_codigo ON "hosting_reservations";
CREATE TRIGGER trigger_generate_reserva_codigo
BEFORE INSERT ON "hosting_reservations"
FOR EACH ROW
EXECUTE FUNCTION generate_reservation_code();

DROP TRIGGER IF EXISTS trigger_update_chale_status ON "hosting_reservations";
CREATE TRIGGER trigger_update_chale_status
AFTER INSERT OR UPDATE OF "status" ON "hosting_reservations"
FOR EACH ROW
EXECUTE FUNCTION update_chalet_status_by_reservation();

DROP TRIGGER IF EXISTS trigger_enforce_chalet_images_limit ON "hosting_chalet_images";
CREATE TRIGGER trigger_enforce_chalet_images_limit
BEFORE INSERT OR UPDATE ON "hosting_chalet_images"
FOR EACH ROW
EXECUTE FUNCTION enforce_chalet_images_limit();

CREATE OR REPLACE VIEW vw_current_occupancy AS
SELECT
  c."id" AS chalet_id,
  c."codigo" AS chalet_code,
  c."nome" AS chalet_name,
  r."id" AS reservation_id,
  r."codigo" AS reservation_code,
  r."nome_hospede" AS guest_name,
  r."data_checkin" AS checkin_date,
  r."data_checkout" AS checkout_date,
  r."status" AS reservation_status
FROM "hosting_chalets" c
LEFT JOIN "hosting_reservations" r
  ON r."chale_id" = c."id"
 AND r."status" = 'OCCUPIED'
 AND CURRENT_DATE BETWEEN r."data_checkin" AND r."data_checkout"
 AND r."deleted_at" IS NULL
WHERE c."deleted_at" IS NULL;

CREATE OR REPLACE VIEW vw_hosting_dashboard AS
SELECT
  (SELECT COUNT(*) FROM "hosting_chalets" c WHERE c."deleted_at" IS NULL) AS total_chalets,
  (SELECT COUNT(*) FROM "hosting_chalets" c WHERE c."deleted_at" IS NULL AND c."status" = 'OCCUPIED') AS occupied_chalets,
  (
    SELECT COUNT(*)
    FROM "hosting_reservations" r
    WHERE r."deleted_at" IS NULL
      AND r."status" IN ('PENDING', 'CONFIRMED', 'OCCUPIED')
  ) AS active_reservations,
  (
    SELECT COUNT(*)
    FROM "hosting_reservations" r
    WHERE r."deleted_at" IS NULL
      AND r."status" = 'CANCELLED'
  ) AS cancelled_reservations,
  (
    SELECT COALESCE(SUM(r."valor_total"), 0)
    FROM "hosting_reservations" r
    WHERE r."deleted_at" IS NULL
      AND r."status" = 'COMPLETED'
      AND DATE_TRUNC('month', COALESCE(r."checkout_realizado_em", r."updated_at")) = DATE_TRUNC('month', CURRENT_TIMESTAMP)
  ) AS monthly_revenue;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HostingContactChannel') THEN
    CREATE TYPE "HostingContactChannel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HospedagemKpiType') THEN
    CREATE TYPE "HospedagemKpiType" AS ENUM (
      'OCCUPANCY_RATE',
      'TOTAL_REVENUE',
      'ACTIVE_RESERVATIONS',
      'CANCELLED_RESERVATIONS',
      'AVAILABLE_CHALES',
      'OCCUPIED_CHALES'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HostingNotificationChannel') THEN
    CREATE TYPE "HostingNotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'PAYMENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HostingNotificationStatus') THEN
    CREATE TYPE "HostingNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "cancellation_policies" (
  "id" TEXT NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "free_cancellation_days" INTEGER NOT NULL DEFAULT 14,
  "partial_penalty_from_day" INTEGER NOT NULL DEFAULT 7,
  "partial_penalty_to_day" INTEGER NOT NULL DEFAULT 13,
  "partial_penalty_percent" DECIMAL(5,2) NOT NULL DEFAULT 20,
  "full_penalty_percent" DECIMAL(5,2) NOT NULL DEFAULT 50,
  "terms_version" VARCHAR(50) NOT NULL,
  "terms_content" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cancellation_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reservation_guests" (
  "id" TEXT NOT NULL,
  "reservation_id" TEXT NOT NULL,
  "full_name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255),
  "phone" VARCHAR(30),
  "cpf" VARCHAR(14),
  "rg" VARCHAR(20),
  "birth_date" DATE,
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reservation_guests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hosting_kpis" (
  "id" TEXT NOT NULL,
  "reference_date" DATE NOT NULL,
  "metric" "HospedagemKpiType" NOT NULL,
  "value" DECIMAL(15,2) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hosting_kpis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "hosting_notification_logs" (
  "id" TEXT NOT NULL,
  "reservation_id" TEXT,
  "user_id" TEXT,
  "channel" "HostingNotificationChannel" NOT NULL,
  "event" TEXT NOT NULL,
  "recipient" VARCHAR(255) NOT NULL,
  "payload" JSONB,
  "status" "HostingNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "next_retry_at" TIMESTAMP(3),
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "hosting_notification_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "cancellation_policy_id" TEXT;
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "no_show_at" TIMESTAMP(3);
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "no_show_fee_amount" DECIMAL(12,2);
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "no_show_reason" TEXT;
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "vehicle_plate" VARCHAR(20);
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "vehicle_model" VARCHAR(120);
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "vehicle_color" VARCHAR(60);
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "vehicle_type" VARCHAR(60);
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "extra_bed_requested" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "extra_bed_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "negotiation_notes" TEXT;
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "contact_channel" "HostingContactChannel";
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "contact_notes" TEXT;
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "policies_accepted" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "policies_accepted_at" TIMESTAMP(3);
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "policy_version" VARCHAR(50);
ALTER TABLE "hosting_reservations" ADD COLUMN IF NOT EXISTS "policy_term" TEXT;

CREATE INDEX IF NOT EXISTS "cancellation_policies_is_active_effective_from_effective_to_idx"
  ON "cancellation_policies"("is_active", "effective_from", "effective_to");
CREATE INDEX IF NOT EXISTS "cancellation_policies_created_by_idx" ON "cancellation_policies"("created_by");
CREATE INDEX IF NOT EXISTS "reservation_guests_reservation_id_idx" ON "reservation_guests"("reservation_id");
CREATE INDEX IF NOT EXISTS "idx_hospedes_reserva_id" ON public."reservation_guests"("reservation_id");
CREATE INDEX IF NOT EXISTS "reservation_guests_cpf_idx" ON "reservation_guests"("cpf");
CREATE UNIQUE INDEX IF NOT EXISTS "hosting_kpis_metric_reference_date_key" ON "hosting_kpis"("metric", "reference_date");
CREATE INDEX IF NOT EXISTS "hosting_kpis_metric_reference_date_idx" ON "hosting_kpis"("metric", "reference_date");
CREATE INDEX IF NOT EXISTS "idx_hospedagem_kpis_data" ON public."hosting_kpis"("reference_date");
CREATE INDEX IF NOT EXISTS "idx_hospedagem_kpis_tipo" ON public."hosting_kpis"("metric");
CREATE INDEX IF NOT EXISTS "hosting_notification_logs_reservation_id_idx" ON "hosting_notification_logs"("reservation_id");
CREATE INDEX IF NOT EXISTS "hosting_notification_logs_user_id_idx" ON "hosting_notification_logs"("user_id");
CREATE INDEX IF NOT EXISTS "hosting_notification_logs_status_next_retry_at_idx" ON "hosting_notification_logs"("status", "next_retry_at");
CREATE INDEX IF NOT EXISTS "hosting_notification_logs_channel_event_created_at_idx" ON "hosting_notification_logs"("channel", "event", "created_at");
CREATE INDEX IF NOT EXISTS "hosting_reservations_cancellation_policy_id_idx" ON "hosting_reservations"("cancellation_policy_id");
CREATE INDEX IF NOT EXISTS "hosting_reservations_no_show_at_idx" ON "hosting_reservations"("no_show_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cancellation_policies_created_by_fkey'
  ) THEN
    ALTER TABLE "cancellation_policies"
      ADD CONSTRAINT "cancellation_policies_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reservation_guests_reservation_id_fkey'
  ) THEN
    ALTER TABLE "reservation_guests"
      ADD CONSTRAINT "reservation_guests_reservation_id_fkey"
      FOREIGN KEY ("reservation_id") REFERENCES "hosting_reservations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_reservations_cancellation_policy_id_fkey'
  ) THEN
    ALTER TABLE "hosting_reservations"
      ADD CONSTRAINT "hosting_reservations_cancellation_policy_id_fkey"
      FOREIGN KEY ("cancellation_policy_id") REFERENCES "cancellation_policies"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_notification_logs_reservation_id_fkey'
  ) THEN
    ALTER TABLE "hosting_notification_logs"
      ADD CONSTRAINT "hosting_notification_logs_reservation_id_fkey"
      FOREIGN KEY ("reservation_id") REFERENCES "hosting_reservations"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hosting_notification_logs_user_id_fkey'
  ) THEN
    ALTER TABLE "hosting_notification_logs"
      ADD CONSTRAINT "hosting_notification_logs_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION apply_reservation_policy_terms()
RETURNS TRIGGER AS $$
DECLARE
  active_policy RECORD;
BEGIN
  IF NEW."cancellation_policy_id" IS NULL THEN
    SELECT cp."id", cp."terms_version", cp."terms_content"
      INTO active_policy
    FROM "cancellation_policies" cp
    WHERE cp."is_active" = TRUE
      AND NEW."data_checkin" >= cp."effective_from"
      AND (cp."effective_to" IS NULL OR NEW."data_checkin" <= cp."effective_to")
    ORDER BY cp."effective_from" DESC
    LIMIT 1;

    IF active_policy."id" IS NOT NULL THEN
      NEW."cancellation_policy_id" := active_policy."id";
      IF NEW."policy_version" IS NULL THEN
        NEW."policy_version" := active_policy."terms_version";
      END IF;
      IF NEW."policy_term" IS NULL THEN
        NEW."policy_term" := active_policy."terms_content";
      END IF;
    END IF;
  END IF;

  IF NEW."policies_accepted" = TRUE AND NEW."policies_accepted_at" IS NULL THEN
    NEW."policies_accepted_at" := CURRENT_TIMESTAMP;
  END IF;

  IF NEW."status" IN ('CONFIRMED', 'OCCUPIED', 'COMPLETED')
     AND NEW."policies_accepted" = FALSE THEN
    RAISE EXCEPTION 'Policy acceptance is required for this reservation status';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enqueue_reservation_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO "hosting_notification_logs" (
      "id", "reservation_id", "user_id", "channel", "event", "recipient", "status", "created_at", "updated_at"
    )
    VALUES (
      SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 32),
      NEW."id",
      NEW."user_id",
      'EMAIL',
      'RESERVATION_CREATED',
      COALESCE(NEW."email_hospede", 'unknown@local'),
      'PENDING',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  ELSIF TG_OP = 'UPDATE' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
    INSERT INTO "hosting_notification_logs" (
      "id", "reservation_id", "user_id", "channel", "event", "recipient", "status", "created_at", "updated_at"
    )
    VALUES (
      SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 32),
      NEW."id",
      NEW."user_id",
      CASE
        WHEN NEW."status" IN ('CONFIRMED', 'CANCELLED') THEN 'WHATSAPP'::"HostingNotificationChannel"
        WHEN NEW."status" IN ('NO_SHOW', 'COMPLETED', 'OCCUPIED') THEN 'EMAIL'::"HostingNotificationChannel"
        ELSE 'PAYMENT'::"HostingNotificationChannel"
      END,
      'RESERVATION_STATUS_' || NEW."status"::TEXT,
      COALESCE(NEW."email_hospede", 'unknown@local'),
      'PENDING',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_apply_reservation_policy_terms ON "hosting_reservations";
CREATE TRIGGER trigger_apply_reservation_policy_terms
BEFORE INSERT OR UPDATE ON "hosting_reservations"
FOR EACH ROW
EXECUTE FUNCTION apply_reservation_policy_terms();

DROP TRIGGER IF EXISTS trigger_enqueue_reservation_notification ON "hosting_reservations";
CREATE TRIGGER trigger_enqueue_reservation_notification
AFTER INSERT OR UPDATE OF "status" ON "hosting_reservations"
FOR EACH ROW
EXECUTE FUNCTION enqueue_reservation_notification();
