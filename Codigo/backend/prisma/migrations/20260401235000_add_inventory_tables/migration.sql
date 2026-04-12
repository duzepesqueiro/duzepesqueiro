DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStatus') THEN
    CREATE TYPE "ProductStatus" AS ENUM ('RENTAL', 'SALE', 'RESTAURANT', 'HOSTING', 'EVENT');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductCategory') THEN
    CREATE TYPE "ProductCategory" AS ENUM (
      'FISHING_EQUIPMENT',
      'FOOD',
      'RENTAL_EQUIPMENT',
      'EVENT_ITEM',
      'HOSTING_ITEM',
      'DRINK',
      'ACCESSORY',
      'CLEANING_MATERIAL',
      'OTHER'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UnitMeasure') THEN
    CREATE TYPE "UnitMeasure" AS ENUM ('KG', 'UNIT', 'LITER', 'PACKAGE', 'METER', 'BOX');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TurnoverRate') THEN
    CREATE TYPE "TurnoverRate" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryMovementType') THEN
    CREATE TYPE "InventoryMovementType" AS ENUM ('INBOUND', 'OUTBOUND');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InventoryMovementReason') THEN
    CREATE TYPE "InventoryMovementReason" AS ENUM (
      'SALE',
      'PURCHASE',
      'DAMAGE',
      'LOSS',
      'RETURN',
      'ADJUSTMENT',
      'RENTAL',
      'RENTAL_RETURN',
      'TRANSFER'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockKpiType') THEN
    CREATE TYPE "StockKpiType" AS ENUM (
      'TOTAL_STOCK_VALUE',
      'STOCK_TURNOVER',
      'STOCKOUT_FREQUENCY',
      'LOW_STOCK',
      'AGED_STOCK'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RentalEquipmentQuality') THEN
    CREATE TYPE "RentalEquipmentQuality" AS ENUM ('GOOD', 'MEDIUM', 'BAD');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PurchaseOrderStatus') THEN
    CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryStatus') THEN
    CREATE TYPE "DeliveryStatus" AS ENUM ('COMPLETE', 'PARTIAL', 'LATE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderPriority') THEN
    CREATE TYPE "OrderPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "fornecedores" (
  "id" TEXT NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "cnpj" VARCHAR(18) NOT NULL,
  "classificacao" SMALLINT NOT NULL,
  "total_pedidos" INTEGER NOT NULL DEFAULT 0,
  "valor_acumulado" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "total_itens_comprados" INTEGER NOT NULL DEFAULT 0,
  "entregas_no_prazo" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "produtos" (
  "id" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "nome" VARCHAR(255) NOT NULL,
  "descricao" TEXT,
  "imagem" VARCHAR(500),
  "status" "ProductStatus" NOT NULL,
  "categoria" "ProductCategory" NOT NULL,
  "unidade_medida" "UnitMeasure" NOT NULL,
  "quantidade_estoque" DECIMAL(15, 3) NOT NULL DEFAULT 0,
  "limite_minimo" DECIMAL(15, 3) NOT NULL DEFAULT 0,
  "quantidade_sugerida" DECIMAL(15, 3) NOT NULL DEFAULT 0,
  "preco_custo" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "preco_venda" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "localizacao" VARCHAR(255),
  "data_reabastecimento" TIMESTAMP(3),
  "fornecedor_id" TEXT NOT NULL,
  "criado_por" TEXT NOT NULL,
  "editado_por" TEXT,
  "rotatividade" "TurnoverRate" NOT NULL DEFAULT 'MEDIUM',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "movimentacao_estoque" (
  "id" TEXT NOT NULL,
  "produto_id" TEXT NOT NULL,
  "tipo" "InventoryMovementType" NOT NULL,
  "motivo" "InventoryMovementReason" NOT NULL,
  "quantity" DECIMAL(15, 3) NOT NULL,
  "saldo_anterior" DECIMAL(15, 3) NOT NULL,
  "saldo_posterior" DECIMAL(15, 3) NOT NULL,
  "referencia_id" TEXT,
  "referencia_tipo" TEXT,
  "usuario_id" TEXT NOT NULL,
  "observacao" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimentacao_estoque_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "kpi_agregados" (
  "id" TEXT NOT NULL,
  "data_referencia" DATE NOT NULL,
  "tipo_kpi" "StockKpiType" NOT NULL,
  "valor" DECIMAL(15, 2) NOT NULL,
  "variacao_percentual" DECIMAL(5, 2),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kpi_agregados_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "controle_concorrencia" (
  "id" TEXT NOT NULL,
  "produto_id" TEXT NOT NULL,
  "versao" INTEGER NOT NULL DEFAULT 0,
  "lock_expiracao" TIMESTAMP(3),
  "locked_by" TEXT,
  CONSTRAINT "controle_concorrencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "inventario_aluguel" (
  "produto_id" TEXT NOT NULL,
  "qualidade" "RentalEquipmentQuality" NOT NULL,
  "ultima_verificacao" TIMESTAMP(3) NOT NULL,
  "observacao" TEXT,
  CONSTRAINT "inventario_aluguel_pkey" PRIMARY KEY ("produto_id")
);

CREATE TABLE IF NOT EXISTS "ordens_compra" (
  "id" TEXT NOT NULL,
  "fornecedor_id" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL,
  "status_entrega" "DeliveryStatus" NOT NULL,
  "prioridade" "OrderPriority" NOT NULL,
  "data_pedido" TIMESTAMP(3) NOT NULL,
  "data_entrega_prevista" TIMESTAMP(3) NOT NULL,
  "data_entrega_real" TIMESTAMP(3),
  "valor_total" DECIMAL(15, 2) NOT NULL DEFAULT 0,
  "observacao" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "ordens_compra_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "itens_ordem_compra" (
  "id" TEXT NOT NULL,
  "ordem_compra_id" TEXT NOT NULL,
  "produto_id" TEXT NOT NULL,
  "quantity" DECIMAL(15, 3) NOT NULL,
  "preco_unitario" DECIMAL(15, 2) NOT NULL,
  "quantidade_recebida" DECIMAL(15, 3) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "itens_ordem_compra_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fornecedores_cnpj_key" ON "fornecedores"("cnpj");
CREATE UNIQUE INDEX IF NOT EXISTS "produtos_sku_key" ON "produtos"("sku");
CREATE UNIQUE INDEX IF NOT EXISTS "kpi_agregados_tipo_kpi_data_referencia_key" ON "kpi_agregados"("tipo_kpi", "data_referencia");
CREATE UNIQUE INDEX IF NOT EXISTS "controle_concorrencia_produto_id_key" ON "controle_concorrencia"("produto_id");

CREATE INDEX IF NOT EXISTS "produtos_status_deleted_at_idx" ON "produtos"("status", "deleted_at");
CREATE INDEX IF NOT EXISTS "produtos_categoria_deleted_at_idx" ON "produtos"("categoria", "deleted_at");
CREATE INDEX IF NOT EXISTS "produtos_fornecedor_id_idx" ON "produtos"("fornecedor_id");
CREATE INDEX IF NOT EXISTS "movimentacao_estoque_produto_id_created_at_idx" ON "movimentacao_estoque"("produto_id", "created_at");
CREATE INDEX IF NOT EXISTS "movimentacao_estoque_tipo_created_at_idx" ON "movimentacao_estoque"("tipo", "created_at");
CREATE INDEX IF NOT EXISTS "kpi_agregados_tipo_kpi_data_referencia_idx" ON "kpi_agregados"("tipo_kpi", "data_referencia");
CREATE INDEX IF NOT EXISTS "ordens_compra_fornecedor_id_status_idx" ON "ordens_compra"("fornecedor_id", "status");
CREATE INDEX IF NOT EXISTS "ordens_compra_data_pedido_idx" ON "ordens_compra"("data_pedido");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produtos_fornecedor_id_fkey'
  ) THEN
    ALTER TABLE "produtos"
      ADD CONSTRAINT "produtos_fornecedor_id_fkey"
      FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produtos_criado_por_fkey'
  ) THEN
    ALTER TABLE "produtos"
      ADD CONSTRAINT "produtos_criado_por_fkey"
      FOREIGN KEY ("criado_por") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'produtos_editado_por_fkey'
  ) THEN
    ALTER TABLE "produtos"
      ADD CONSTRAINT "produtos_editado_por_fkey"
      FOREIGN KEY ("editado_por") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimentacao_estoque_produto_id_fkey'
  ) THEN
    ALTER TABLE "movimentacao_estoque"
      ADD CONSTRAINT "movimentacao_estoque_produto_id_fkey"
      FOREIGN KEY ("produto_id") REFERENCES "produtos"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'movimentacao_estoque_usuario_id_fkey'
  ) THEN
    ALTER TABLE "movimentacao_estoque"
      ADD CONSTRAINT "movimentacao_estoque_usuario_id_fkey"
      FOREIGN KEY ("usuario_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'controle_concorrencia_produto_id_fkey'
  ) THEN
    ALTER TABLE "controle_concorrencia"
      ADD CONSTRAINT "controle_concorrencia_produto_id_fkey"
      FOREIGN KEY ("produto_id") REFERENCES "produtos"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'controle_concorrencia_locked_by_fkey'
  ) THEN
    ALTER TABLE "controle_concorrencia"
      ADD CONSTRAINT "controle_concorrencia_locked_by_fkey"
      FOREIGN KEY ("locked_by") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventario_aluguel_produto_id_fkey'
  ) THEN
    ALTER TABLE "inventario_aluguel"
      ADD CONSTRAINT "inventario_aluguel_produto_id_fkey"
      FOREIGN KEY ("produto_id") REFERENCES "produtos"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ordens_compra_fornecedor_id_fkey'
  ) THEN
    ALTER TABLE "ordens_compra"
      ADD CONSTRAINT "ordens_compra_fornecedor_id_fkey"
      FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itens_ordem_compra_ordem_compra_id_fkey'
  ) THEN
    ALTER TABLE "itens_ordem_compra"
      ADD CONSTRAINT "itens_ordem_compra_ordem_compra_id_fkey"
      FOREIGN KEY ("ordem_compra_id") REFERENCES "ordens_compra"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'itens_ordem_compra_produto_id_fkey'
  ) THEN
    ALTER TABLE "itens_ordem_compra"
      ADD CONSTRAINT "itens_ordem_compra_produto_id_fkey"
      FOREIGN KEY ("produto_id") REFERENCES "produtos"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
