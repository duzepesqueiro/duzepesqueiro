-- MÓDULO: users
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'users' AS module;

-- ENTIDADE/TABELA: users
-- Marcador de entidade (útil para separar o CRUD por tabela)
SELECT 'users' AS entity;
-- CREATE: cria um usuário
INSERT INTO "users" ("id", "username", "passwordHash", "role", "isActive", "status", "failedAttempts", "lastLoginAt", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4::"UserRole", $5, $6::"UserStatus", $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista usuários (mais recentes primeiro)
SELECT * FROM "users" ORDER BY "createdAt" DESC;
-- READ (por PK): busca usuário pelo id
SELECT * FROM "users" WHERE "id" = $1;
-- UPDATE: atualiza usuário pelo id
UPDATE "users"
SET "username" = $2,
    "passwordHash" = $3,
    "role" = $4::"UserRole",
    "isActive" = $5,
    "status" = $6::"UserStatus",
    "failedAttempts" = $7,
    "lastLoginAt" = $8,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove usuário pelo id
DELETE FROM "users" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: user_profiles
SELECT 'user_profiles' AS entity;
-- CREATE: cria perfil de usuário
INSERT INTO "user_profiles" ("id", "userId", "fullName", "document", "birthDate", "updatedAt")
VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista perfis por data de atualização
SELECT * FROM "user_profiles" ORDER BY "updatedAt" DESC;
-- READ (por PK): busca perfil pelo id
SELECT * FROM "user_profiles" WHERE "id" = $1;
-- UPDATE: atualiza perfil pelo id
UPDATE "user_profiles"
SET "userId" = $2,
    "fullName" = $3,
    "document" = $4,
    "birthDate" = $5,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove perfil pelo id
DELETE FROM "user_profiles" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: user_emails
SELECT 'user_emails' AS entity;
-- CREATE: cadastra e-mail do usuário
INSERT INTO "user_emails" ("id", "userId", "email", "isPrimary", "isVerified", "token", "token_expires_at")
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;
-- READ (lista): lista e-mails (ordem por id)
SELECT * FROM "user_emails" ORDER BY "id" DESC;
-- READ (por PK): busca e-mail pelo id
SELECT * FROM "user_emails" WHERE "id" = $1;
-- UPDATE: atualiza e-mail pelo id
UPDATE "user_emails"
SET "userId" = $2,
    "email" = $3,
    "isPrimary" = $4,
    "isVerified" = $5,
    "token" = $6,
    "token_expires_at" = $7
WHERE "id" = $1
RETURNING *;
-- DELETE: remove e-mail pelo id
DELETE FROM "user_emails" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: user_phones
SELECT 'user_phones' AS entity;
-- CREATE: cadastra telefone do usuário
INSERT INTO "user_phones" ("id", "userId", "phoneNumber", "isPrimary", "isVerified", "verificationCode", "verifiedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;
-- READ (lista): lista telefones (ordem por id)
SELECT * FROM "user_phones" ORDER BY "id" DESC;
-- READ (por PK): busca telefone pelo id
SELECT * FROM "user_phones" WHERE "id" = $1;
-- UPDATE: atualiza telefone pelo id
UPDATE "user_phones"
SET "userId" = $2,
    "phoneNumber" = $3,
    "isPrimary" = $4,
    "isVerified" = $5,
    "verificationCode" = $6,
    "verifiedAt" = $7
WHERE "id" = $1
RETURNING *;
-- DELETE: remove telefone pelo id
DELETE FROM "user_phones" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: user_refresh_tokens
SELECT 'user_refresh_tokens' AS entity;
-- CREATE: cria refresh token (hash) para o usuário
INSERT INTO "user_refresh_tokens" ("id", "user_id", "token_hash", "created_at", "expires_at", "revoked_at", "replaced_by_id")
VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)
RETURNING *;
-- READ (lista): lista tokens por data de criação
SELECT * FROM "user_refresh_tokens" ORDER BY "created_at" DESC;
-- READ (por PK): busca token pelo id
SELECT * FROM "user_refresh_tokens" WHERE "id" = $1;
-- UPDATE: atualiza token pelo id (ex.: revogar/alterar expiração/substituição)
UPDATE "user_refresh_tokens"
SET "user_id" = $2,
    "token_hash" = $3,
    "expires_at" = $4,
    "revoked_at" = $5,
    "replaced_by_id" = $6
WHERE "id" = $1
RETURNING *;
-- DELETE: remove token pelo id
DELETE FROM "user_refresh_tokens" WHERE "id" = $1 RETURNING *;

-- MÓDULO: jobs
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'jobs' AS module;

-- ENTIDADE/TABELA: job_runs
SELECT 'job_runs' AS entity;
-- CREATE: registra execução de job
INSERT INTO "job_runs" ("id", "job_key", "status", "started_at", "finished_at", "error_message", "meta", "created_at", "updated_at")
VALUES ($1, $2, $3::"JobRunStatus", $4, $5, $6, $7::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista execuções por data de início
SELECT * FROM "job_runs" ORDER BY "started_at" DESC;
-- READ (por PK): busca execução pelo id
SELECT * FROM "job_runs" WHERE "id" = $1;
-- UPDATE: atualiza execução do job (status, término, erro, meta)
UPDATE "job_runs"
SET "job_key" = $2,
    "status" = $3::"JobRunStatus",
    "started_at" = $4,
    "finished_at" = $5,
    "error_message" = $6,
    "meta" = $7::jsonb,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove execução pelo id
DELETE FROM "job_runs" WHERE "id" = $1 RETURNING *;

-- MÓDULO: payments
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'payments' AS module;

-- ENTIDADE/TABELA: payments
SELECT 'payments' AS entity;
-- CREATE: cria pagamento
INSERT INTO "payments" (
  "id", "external_id", "domain", "entity_id", "external_reference", "transaction_amount", "net_received_amount",
  "installments", "installment_amount", "status", "status_detail", "payment_method", "payment_method_id",
  "payment_type_id", "issuer_id", "payer_email", "payer_name", "payer_document", "payer_document_type",
  "pix_qr_code", "pix_qr_code_base64", "pix_ticket_url", "idempotency_key", "captured", "binary_mode",
  "metadata", "date_created", "date_approved", "date_last_updated", "date_of_expiration", "money_release_date", "user_id"
)
VALUES (
  $1, $2, $3::"PaymentDomain", $4, $5, $6, $7,
  $8, $9, $10::"PaymentStatus", $11, $12::"PaymentMethod", $13,
  $14, $15, $16, $17, $18, $19,
  $20, $21, $22, $23, $24, $25,
  $26::jsonb, COALESCE($27, CURRENT_TIMESTAMP), $28, CURRENT_TIMESTAMP, $29, $30, $31
)
RETURNING *;
-- READ (lista): lista pagamentos por data de criação
SELECT * FROM "payments" ORDER BY "date_created" DESC;
-- READ (por PK): busca pagamento pelo id
SELECT * FROM "payments" WHERE "id" = $1;
-- UPDATE: atualiza pagamento pelo id
UPDATE "payments"
SET "external_id" = $2,
    "domain" = $3::"PaymentDomain",
    "entity_id" = $4,
    "external_reference" = $5,
    "transaction_amount" = $6,
    "net_received_amount" = $7,
    "installments" = $8,
    "installment_amount" = $9,
    "status" = $10::"PaymentStatus",
    "status_detail" = $11,
    "payment_method" = $12::"PaymentMethod",
    "payment_method_id" = $13,
    "payment_type_id" = $14,
    "issuer_id" = $15,
    "payer_email" = $16,
    "payer_name" = $17,
    "payer_document" = $18,
    "payer_document_type" = $19,
    "pix_qr_code" = $20,
    "pix_qr_code_base64" = $21,
    "pix_ticket_url" = $22,
    "idempotency_key" = $23,
    "captured" = $24,
    "binary_mode" = $25,
    "metadata" = $26::jsonb,
    "date_created" = COALESCE($27, "date_created"),
    "date_approved" = $28,
    "date_last_updated" = CURRENT_TIMESTAMP,
    "date_of_expiration" = $29,
    "money_release_date" = $30,
    "user_id" = $31
WHERE "id" = $1
RETURNING *;
-- DELETE: remove pagamento pelo id
DELETE FROM "payments" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: payment_webhook_logs
SELECT 'payment_webhook_logs' AS entity;
-- CREATE: registra log de webhook de pagamento
INSERT INTO "payment_webhook_logs" ("id", "payment_id", "request_id", "action", "type", "payload", "processed_at")
VALUES ($1, $2, $3, $4, $5, $6::jsonb, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista logs de webhook por processamento
SELECT * FROM "payment_webhook_logs" ORDER BY "processed_at" DESC;
-- READ (por PK): busca log pelo id
SELECT * FROM "payment_webhook_logs" WHERE "id" = $1;
-- UPDATE: atualiza log de webhook pelo id
UPDATE "payment_webhook_logs"
SET "payment_id" = $2,
    "request_id" = $3,
    "action" = $4,
    "type" = $5,
    "payload" = $6::jsonb
WHERE "id" = $1
RETURNING *;
-- DELETE: remove log pelo id
DELETE FROM "payment_webhook_logs" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: payment_refunds
SELECT 'payment_refunds' AS entity;
-- CREATE: cria registro de estorno/refund
INSERT INTO "payment_refunds" ("id", "payment_id", "external_id", "amount", "reason", "status", "created_at")
VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista refunds por data de criação
SELECT * FROM "payment_refunds" ORDER BY "created_at" DESC;
-- READ (por PK): busca refund pelo id
SELECT * FROM "payment_refunds" WHERE "id" = $1;
-- UPDATE: atualiza refund pelo id
UPDATE "payment_refunds"
SET "payment_id" = $2,
    "external_id" = $3,
    "amount" = $4,
    "reason" = $5,
    "status" = $6
WHERE "id" = $1
RETURNING *;
-- DELETE: remove refund pelo id
DELETE FROM "payment_refunds" WHERE "id" = $1 RETURNING *;

-- MÓDULO: events
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'events' AS module;

-- ENTIDADE/TABELA: events
SELECT 'events' AS entity;
-- CREATE: cria evento
INSERT INTO "events" (
  "id", "title", "description", "rules", "location", "image_url", "image_key",
  "total_slots", "available_slots", "event_date", "event_time", "status", "price", "is_paid",
  "created_at", "updated_at", "deleted_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7,
  $8, $9, $10, $11, $12::"EventStatus", $13, $14,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $15
)
RETURNING *;
-- READ (lista): lista eventos não deletados por data
SELECT * FROM "events" WHERE "deleted_at" IS NULL ORDER BY "event_date" DESC;
-- READ (por PK): busca evento pelo id
SELECT * FROM "events" WHERE "id" = $1;
-- UPDATE: atualiza evento pelo id
UPDATE "events"
SET "title" = $2,
    "description" = $3,
    "rules" = $4,
    "location" = $5,
    "image_url" = $6,
    "image_key" = $7,
    "total_slots" = $8,
    "available_slots" = $9,
    "event_date" = $10,
    "event_time" = $11,
    "status" = $12::"EventStatus",
    "price" = $13,
    "is_paid" = $14,
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_at" = $15
WHERE "id" = $1
RETURNING *;
-- DELETE: remove evento pelo id
DELETE FROM "events" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: event_images
SELECT 'event_images' AS entity;
-- CREATE: adiciona imagem do evento
INSERT INTO "event_images" ("id", "event_id", "image_url", "image_key", "created_at")
VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista imagens por data de criação
SELECT * FROM "event_images" ORDER BY "created_at" DESC;
-- READ (por PK): busca imagem pelo id
SELECT * FROM "event_images" WHERE "id" = $1;
-- UPDATE: atualiza imagem do evento pelo id
UPDATE "event_images"
SET "event_id" = $2,
    "image_url" = $3,
    "image_key" = $4
WHERE "id" = $1
RETURNING *;
-- DELETE: remove imagem pelo id
DELETE FROM "event_images" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: event_registrations
SELECT 'event_registrations' AS entity;
-- CREATE: cria inscrição de usuário em evento
INSERT INTO "event_registrations" (
  "id", "user_id", "event_id", "status", "order_id", "payment_status",
  "registered_at", "confirmed_at", "cancelled_at", "created_at", "updated_at"
)
VALUES (
  $1, $2, $3, $4::"EventRegistrationStatus", $5, $6::"EventPaymentStatus",
  CURRENT_TIMESTAMP, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista inscrições por data de criação
SELECT * FROM "event_registrations" ORDER BY "created_at" DESC;
-- READ (por PK): busca inscrição pelo id
SELECT * FROM "event_registrations" WHERE "id" = $1;
-- UPDATE: atualiza inscrição pelo id (status, datas, pagamento)
UPDATE "event_registrations"
SET "user_id" = $2,
    "event_id" = $3,
    "status" = $4::"EventRegistrationStatus",
    "order_id" = $5,
    "payment_status" = $6::"EventPaymentStatus",
    "confirmed_at" = $7,
    "cancelled_at" = $8,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove inscrição pelo id
DELETE FROM "event_registrations" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: event_kpi_goals
SELECT 'event_kpi_goals' AS entity;
-- CREATE: cria meta de KPI de eventos
INSERT INTO "event_kpi_goals" ("id", "kpi_type", "target_value", "month", "year", "created_at", "updated_at")
VALUES ($1, $2::"KpiType", $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista metas por ano/mês
SELECT * FROM "event_kpi_goals" ORDER BY "year" DESC, "month" DESC;
-- READ (por PK): busca meta pelo id
SELECT * FROM "event_kpi_goals" WHERE "id" = $1;
-- UPDATE: atualiza meta pelo id
UPDATE "event_kpi_goals"
SET "kpi_type" = $2::"KpiType",
    "target_value" = $3,
    "month" = $4,
    "year" = $5,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove meta pelo id
DELETE FROM "event_kpi_goals" WHERE "id" = $1 RETURNING *;

-- MÓDULO: inventory
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'inventory' AS module;

-- ENTIDADE/TABELA: fornecedores
SELECT 'fornecedores' AS entity;
-- CREATE: cria fornecedor
INSERT INTO "fornecedores" (
  "id", "nome", "cnpj", "classificacao", "total_pedidos", "valor_acumulado",
  "total_itens_comprados", "entregas_no_prazo", "created_at", "updated_at", "deleted_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6,
  $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $9
)
RETURNING *;
-- READ (lista): lista fornecedores não deletados por data de criação
SELECT * FROM "fornecedores" WHERE "deleted_at" IS NULL ORDER BY "created_at" DESC;
-- READ (por PK): busca fornecedor pelo id
SELECT * FROM "fornecedores" WHERE "id" = $1;
-- UPDATE: atualiza fornecedor pelo id
UPDATE "fornecedores"
SET "nome" = $2,
    "cnpj" = $3,
    "classificacao" = $4,
    "total_pedidos" = $5,
    "valor_acumulado" = $6,
    "total_itens_comprados" = $7,
    "entregas_no_prazo" = $8,
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_at" = $9
WHERE "id" = $1
RETURNING *;
-- DELETE: remove fornecedor pelo id
DELETE FROM "fornecedores" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: produtos
SELECT 'produtos' AS entity;
-- CREATE: cria produto
INSERT INTO "produtos" (
  "id", "sku", "nome", "descricao", "imagem", "status", "categoria", "unidade_medida",
  "quantidade_estoque", "limite_minimo", "quantidade_sugerida", "preco_custo", "preco_venda", "localizacao",
  "data_reabastecimento", "fornecedor_id", "criado_por", "editado_por", "rotatividade",
  "created_at", "updated_at", "deleted_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6::"ProductStatus", $7::"ProductCategory", $8::"UnitMeasure",
  $9, $10, $11, $12, $13, $14,
  $15, $16, $17, $18, $19::"TurnoverRate",
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $20
)
RETURNING *;
-- READ (lista): lista produtos não deletados por data de criação
SELECT * FROM "produtos" WHERE "deleted_at" IS NULL ORDER BY "created_at" DESC;
-- READ (por PK): busca produto pelo id
SELECT * FROM "produtos" WHERE "id" = $1;
-- UPDATE: atualiza produto pelo id
UPDATE "produtos"
SET "sku" = $2,
    "nome" = $3,
    "descricao" = $4,
    "imagem" = $5,
    "status" = $6::"ProductStatus",
    "categoria" = $7::"ProductCategory",
    "unidade_medida" = $8::"UnitMeasure",
    "quantidade_estoque" = $9,
    "limite_minimo" = $10,
    "quantidade_sugerida" = $11,
    "preco_custo" = $12,
    "preco_venda" = $13,
    "localizacao" = $14,
    "data_reabastecimento" = $15,
    "fornecedor_id" = $16,
    "criado_por" = $17,
    "editado_por" = $18,
    "rotatividade" = $19::"TurnoverRate",
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_at" = $20
WHERE "id" = $1
RETURNING *;
-- DELETE: remove produto pelo id
DELETE FROM "produtos" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: produto_imagens
SELECT 'produto_imagens' AS entity;
-- CREATE: adiciona imagem de produto
INSERT INTO "produto_imagens" ("id", "produto_id", "image_url", "created_at")
VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista imagens de produto por data
SELECT * FROM "produto_imagens" ORDER BY "created_at" DESC;
-- READ (por PK): busca imagem pelo id
SELECT * FROM "produto_imagens" WHERE "id" = $1;
-- UPDATE: atualiza imagem de produto pelo id
UPDATE "produto_imagens"
SET "produto_id" = $2,
    "image_url" = $3
WHERE "id" = $1
RETURNING *;
-- DELETE: remove imagem pelo id
DELETE FROM "produto_imagens" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: movimentacao_estoque
SELECT 'movimentacao_estoque' AS entity;
-- CREATE: registra movimentação de estoque
INSERT INTO "movimentacao_estoque" (
  "id", "produto_id", "tipo", "motivo", "quantity", "saldo_anterior", "saldo_posterior",
  "referencia_id", "referencia_tipo", "usuario_id", "observacao", "created_at"
)
VALUES (
  $1, $2, $3::"InventoryMovementType", $4::"InventoryMovementReason", $5, $6, $7,
  $8, $9, $10, $11, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista movimentações por data de criação
SELECT * FROM "movimentacao_estoque" ORDER BY "created_at" DESC;
-- READ (por PK): busca movimentação pelo id
SELECT * FROM "movimentacao_estoque" WHERE "id" = $1;
-- UPDATE: atualiza movimentação pelo id
UPDATE "movimentacao_estoque"
SET "produto_id" = $2,
    "tipo" = $3::"InventoryMovementType",
    "motivo" = $4::"InventoryMovementReason",
    "quantity" = $5,
    "saldo_anterior" = $6,
    "saldo_posterior" = $7,
    "referencia_id" = $8,
    "referencia_tipo" = $9,
    "usuario_id" = $10,
    "observacao" = $11
WHERE "id" = $1
RETURNING *;
-- DELETE: remove movimentação pelo id
DELETE FROM "movimentacao_estoque" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: inventario_aluguel
SELECT 'inventario_aluguel' AS entity;
-- CREATE: cria/atualiza registro de inventário específico para aluguel (por produto_id)
INSERT INTO "inventario_aluguel" ("produto_id", "qualidade", "ultima_verificacao", "observacao")
VALUES ($1, $2::"RentalEquipmentQuality", $3, $4)
RETURNING *;
-- READ (lista): lista inventário de aluguel por última verificação
SELECT * FROM "inventario_aluguel" ORDER BY "ultima_verificacao" DESC;
-- READ (por PK): busca inventário de aluguel pelo produto_id
SELECT * FROM "inventario_aluguel" WHERE "produto_id" = $1;
-- UPDATE: atualiza inventário de aluguel pelo produto_id
UPDATE "inventario_aluguel"
SET "qualidade" = $2::"RentalEquipmentQuality",
    "ultima_verificacao" = $3,
    "observacao" = $4
WHERE "produto_id" = $1
RETURNING *;
-- DELETE: remove inventário de aluguel pelo produto_id
DELETE FROM "inventario_aluguel" WHERE "produto_id" = $1 RETURNING *;

-- ENTIDADE/TABELA: ordens_compra
SELECT 'ordens_compra' AS entity;
-- CREATE: cria ordem de compra
INSERT INTO "ordens_compra" (
  "id", "fornecedor_id", "status", "status_entrega", "prioridade", "data_pedido", "data_entrega_prevista",
  "data_entrega_real", "valor_total", "observacao", "created_at", "updated_at", "deleted_at"
)
VALUES (
  $1, $2, $3::"PurchaseOrderStatus", $4::"DeliveryStatus", $5::"OrderPriority", $6, $7,
  $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $11
)
RETURNING *;
-- READ (lista): lista ordens não deletadas por data do pedido
SELECT * FROM "ordens_compra" WHERE "deleted_at" IS NULL ORDER BY "data_pedido" DESC;
-- READ (por PK): busca ordem pelo id
SELECT * FROM "ordens_compra" WHERE "id" = $1;
-- UPDATE: atualiza ordem pelo id
UPDATE "ordens_compra"
SET "fornecedor_id" = $2,
    "status" = $3::"PurchaseOrderStatus",
    "status_entrega" = $4::"DeliveryStatus",
    "prioridade" = $5::"OrderPriority",
    "data_pedido" = $6,
    "data_entrega_prevista" = $7,
    "data_entrega_real" = $8,
    "valor_total" = $9,
    "observacao" = $10,
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_at" = $11
WHERE "id" = $1
RETURNING *;
-- DELETE: remove ordem pelo id
DELETE FROM "ordens_compra" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: itens_ordem_compra
SELECT 'itens_ordem_compra' AS entity;
-- CREATE: cria item de ordem de compra
INSERT INTO "itens_ordem_compra" ("id", "ordem_compra_id", "produto_id", "quantity", "preco_unitario", "quantidade_recebida", "created_at")
VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista itens por data de criação
SELECT * FROM "itens_ordem_compra" ORDER BY "created_at" DESC;
-- READ (por PK): busca item pelo id
SELECT * FROM "itens_ordem_compra" WHERE "id" = $1;
-- UPDATE: atualiza item pelo id
UPDATE "itens_ordem_compra"
SET "ordem_compra_id" = $2,
    "produto_id" = $3,
    "quantity" = $4,
    "preco_unitario" = $5,
    "quantidade_recebida" = $6
WHERE "id" = $1
RETURNING *;
-- DELETE: remove item pelo id
DELETE FROM "itens_ordem_compra" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: kpi_agregados
SELECT 'kpi_agregados' AS entity;
-- CREATE: cria KPI agregado de estoque
INSERT INTO "kpi_agregados" ("id", "data_referencia", "tipo_kpi", "valor", "variacao_percentual", "metadata", "created_at")
VALUES ($1, $2, $3::"StockKpiType", $4, $5, $6::jsonb, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista KPIs por data de referência
SELECT * FROM "kpi_agregados" ORDER BY "data_referencia" DESC;
-- READ (por PK): busca KPI pelo id
SELECT * FROM "kpi_agregados" WHERE "id" = $1;
-- UPDATE: atualiza KPI pelo id
UPDATE "kpi_agregados"
SET "data_referencia" = $2,
    "tipo_kpi" = $3::"StockKpiType",
    "valor" = $4,
    "variacao_percentual" = $5,
    "metadata" = $6::jsonb
WHERE "id" = $1
RETURNING *;
-- DELETE: remove KPI pelo id
DELETE FROM "kpi_agregados" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: controle_concorrencia
SELECT 'controle_concorrencia' AS entity;
-- CREATE: cria controle de concorrência para um produto
INSERT INTO "controle_concorrencia" ("id", "produto_id", "versao", "lock_expiracao", "locked_by")
VALUES ($1, $2, $3, $4, $5)
RETURNING *;
-- READ (lista): lista controles (ordem por versão)
SELECT * FROM "controle_concorrencia" ORDER BY "versao" DESC;
-- READ (por PK): busca controle pelo id
SELECT * FROM "controle_concorrencia" WHERE "id" = $1;
-- UPDATE: atualiza controle pelo id
UPDATE "controle_concorrencia"
SET "produto_id" = $2,
    "versao" = $3,
    "lock_expiracao" = $4,
    "locked_by" = $5
WHERE "id" = $1
RETURNING *;
-- DELETE: remove controle pelo id
DELETE FROM "controle_concorrencia" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: pesqueiro_config
SELECT 'pesqueiro_config' AS entity;
-- CREATE: cria configuração do pesqueiro
INSERT INTO "pesqueiro_config" ("id", "openingTime", "closingTime", "rentalDuration", "maxRentalsPerDay", "overtimeRate", "active", "updatedAt")
VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista configurações por atualização
SELECT * FROM "pesqueiro_config" ORDER BY "updatedAt" DESC;
-- READ (por PK): busca configuração pelo id
SELECT * FROM "pesqueiro_config" WHERE "id" = $1;
-- UPDATE: atualiza configuração pelo id
UPDATE "pesqueiro_config"
SET "openingTime" = $2,
    "closingTime" = $3,
    "rentalDuration" = $4,
    "maxRentalsPerDay" = $5,
    "overtimeRate" = $6,
    "active" = $7,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove configuração pelo id
DELETE FROM "pesqueiro_config" WHERE "id" = $1 RETURNING *;

-- MÓDULO: rentals
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'rentals' AS module;

-- ENTIDADE/TABELA: rentals
SELECT 'rentals' AS entity;
-- CREATE: cria aluguel
INSERT INTO "rentals" (
  "id", "userId", "origin", "paymentStatus", "totalAmount", "rentalDate", "returnDate", "periodType", "periodValue",
  "notes", "paymentMethod", "paymentId", "paidAt", "deletedAt", "createdAt", "updatedAt"
)
VALUES (
  $1, $2, $3::"RentalOrigin", $4::"PaymentStatus", $5, $6, $7, $8::"RentalPeriod", $9,
  $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista aluguéis não deletados por data do aluguel
SELECT * FROM "rentals" WHERE "deletedAt" IS NULL ORDER BY "rentalDate" DESC;
-- READ (por PK): busca aluguel pelo id
SELECT * FROM "rentals" WHERE "id" = $1;
-- UPDATE: atualiza aluguel pelo id
UPDATE "rentals"
SET "userId" = $2,
    "origin" = $3::"RentalOrigin",
    "paymentStatus" = $4::"PaymentStatus",
    "totalAmount" = $5,
    "rentalDate" = $6,
    "returnDate" = $7,
    "periodType" = $8::"RentalPeriod",
    "periodValue" = $9,
    "notes" = $10,
    "paymentMethod" = $11,
    "paymentId" = $12,
    "paidAt" = $13,
    "deletedAt" = $14,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove aluguel pelo id
DELETE FROM "rentals" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: rental_items
SELECT 'rental_items' AS entity;
-- CREATE: cria item de aluguel
INSERT INTO "rental_items" (
  "id", "rentalId", "productId", "quantity", "unitPrice", "subtotal",
  "checkOutAt", "checkInAt", "status", "returnCondition", "conditionNotes",
  "plannedDuration", "actualDuration", "deletedAt", "createdAt", "updatedAt"
)
VALUES (
  $1, $2, $3, $4, $5, $6,
  $7, $8, $9::"RentalStatus", $10::"ItemCondition", $11,
  $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista itens de aluguel não deletados por data de criação
SELECT * FROM "rental_items" WHERE "deletedAt" IS NULL ORDER BY "createdAt" DESC;
-- READ (por PK): busca item pelo id
SELECT * FROM "rental_items" WHERE "id" = $1;
-- UPDATE: atualiza item pelo id
UPDATE "rental_items"
SET "rentalId" = $2,
    "productId" = $3,
    "quantity" = $4,
    "unitPrice" = $5,
    "subtotal" = $6,
    "checkOutAt" = $7,
    "checkInAt" = $8,
    "status" = $9::"RentalStatus",
    "returnCondition" = $10::"ItemCondition",
    "conditionNotes" = $11,
    "plannedDuration" = $12,
    "actualDuration" = $13,
    "deletedAt" = $14,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove item pelo id
DELETE FROM "rental_items" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: rental_carts
SELECT 'rental_carts' AS entity;
-- CREATE: cria carrinho de aluguel
INSERT INTO "rental_carts" ("id", "userId", "scheduledDate", "createdAt", "updatedAt")
VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista carrinhos por data de criação
SELECT * FROM "rental_carts" ORDER BY "createdAt" DESC;
-- READ (por PK): busca carrinho pelo id
SELECT * FROM "rental_carts" WHERE "id" = $1;
-- UPDATE: atualiza carrinho pelo id
UPDATE "rental_carts"
SET "userId" = $2,
    "scheduledDate" = $3,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove carrinho pelo id
DELETE FROM "rental_carts" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: rental_cart_items
SELECT 'rental_cart_items' AS entity;
-- CREATE: cria item do carrinho de aluguel
INSERT INTO "rental_cart_items" ("id", "cartId", "productId", "quantity", "createdAt", "updatedAt")
VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista itens por data de criação
SELECT * FROM "rental_cart_items" ORDER BY "createdAt" DESC;
-- READ (por PK): busca item pelo id
SELECT * FROM "rental_cart_items" WHERE "id" = $1;
-- UPDATE: atualiza item pelo id
UPDATE "rental_cart_items"
SET "cartId" = $2,
    "productId" = $3,
    "quantity" = $4,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove item pelo id
DELETE FROM "rental_cart_items" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: rental_audit_logs
SELECT 'rental_audit_logs' AS entity;
-- CREATE: registra log de auditoria de aluguel
INSERT INTO "rental_audit_logs" (
  "id", "rentalId", "userId", "action", "oldValue", "newValue", "ipAddress", "userAgent", "createdAt"
)
VALUES (
  $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista logs por data de criação
SELECT * FROM "rental_audit_logs" ORDER BY "createdAt" DESC;
-- READ (por PK): busca log pelo id
SELECT * FROM "rental_audit_logs" WHERE "id" = $1;
-- UPDATE: atualiza log pelo id
UPDATE "rental_audit_logs"
SET "rentalId" = $2,
    "userId" = $3,
    "action" = $4,
    "oldValue" = $5::jsonb,
    "newValue" = $6::jsonb,
    "ipAddress" = $7,
    "userAgent" = $8
WHERE "id" = $1
RETURNING *;
-- DELETE: remove log pelo id
DELETE FROM "rental_audit_logs" WHERE "id" = $1 RETURNING *;

-- MÓDULO: sales
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'sales' AS module;

-- ENTIDADE/TABELA: sales_orders
SELECT 'sales_orders' AS entity;
-- CREATE: cria pedido de venda
INSERT INTO "sales_orders" (
  "id", "userId", "status", "paymentStatus", "totalAmount", "note",
  "paymentId", "paidAt", "cancelledAt", "createdAt", "updatedAt"
)
VALUES (
  $1, $2, $3::"SalesOrderStatus", $4::"PaymentStatus", $5, $6,
  $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista pedidos por data de criação
SELECT * FROM "sales_orders" ORDER BY "createdAt" DESC;
-- READ (por PK): busca pedido pelo id
SELECT * FROM "sales_orders" WHERE "id" = $1;
-- UPDATE: atualiza pedido pelo id
UPDATE "sales_orders"
SET "userId" = $2,
    "status" = $3::"SalesOrderStatus",
    "paymentStatus" = $4::"PaymentStatus",
    "totalAmount" = $5,
    "note" = $6,
    "paymentId" = $7,
    "paidAt" = $8,
    "cancelledAt" = $9,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove pedido pelo id
DELETE FROM "sales_orders" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: sales_order_items
SELECT 'sales_order_items' AS entity;
-- CREATE: cria item do pedido de venda
INSERT INTO "sales_order_items" (
  "id", "orderId", "productId", "quantity", "unitPrice", "subtotal", "nameSnapshot", "imageSnapshot", "createdAt", "updatedAt"
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista itens por data de criação
SELECT * FROM "sales_order_items" ORDER BY "createdAt" DESC;
-- READ (por PK): busca item pelo id
SELECT * FROM "sales_order_items" WHERE "id" = $1;
-- UPDATE: atualiza item pelo id
UPDATE "sales_order_items"
SET "orderId" = $2,
    "productId" = $3,
    "quantity" = $4,
    "unitPrice" = $5,
    "subtotal" = $6,
    "nameSnapshot" = $7,
    "imageSnapshot" = $8,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove item pelo id
DELETE FROM "sales_order_items" WHERE "id" = $1 RETURNING *;

-- MÓDULO: notifications
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'notifications' AS module;

-- ENTIDADE/TABELA: notifications
SELECT 'notifications' AS entity;
-- CREATE: cria notificação para um usuário
INSERT INTO "notifications" (
  "id", "recipient_user_id", "source", "event_key", "dedup_key", "title", "message",
  "type", "channel", "payload", "status", "read_at", "created_at", "updated_at", "expires_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7,
  $8::"NotificationType", $9::"NotificationChannel", $10::jsonb, $11::"NotificationStatus", $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $13
)
RETURNING *;
-- READ (lista): lista notificações por data de criação
SELECT * FROM "notifications" ORDER BY "created_at" DESC;
-- READ (por PK): busca notificação pelo id
SELECT * FROM "notifications" WHERE "id" = $1;
-- UPDATE: atualiza notificação pelo id (status/leitura/payload)
UPDATE "notifications"
SET "recipient_user_id" = $2,
    "source" = $3,
    "event_key" = $4,
    "dedup_key" = $5,
    "title" = $6,
    "message" = $7,
    "type" = $8::"NotificationType",
    "channel" = $9::"NotificationChannel",
    "payload" = $10::jsonb,
    "status" = $11::"NotificationStatus",
    "read_at" = $12,
    "updated_at" = CURRENT_TIMESTAMP,
    "expires_at" = $13
WHERE "id" = $1
RETURNING *;
-- DELETE: remove notificação pelo id
DELETE FROM "notifications" WHERE "id" = $1 RETURNING *;

-- MÓDULO: reviews
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'reviews' AS module;

-- ENTIDADE/TABELA: reviews
SELECT 'reviews' AS entity;
-- CREATE: cria avaliação (review)
INSERT INTO "reviews" ("id", "domain", "subject_id", "target_id", "target_name", "user_id", "rating", "comment", "created_at", "updated_at")
VALUES ($1, $2::"ReviewDomain", $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista avaliações por data de criação
SELECT * FROM "reviews" ORDER BY "created_at" DESC;
-- READ (por PK): busca avaliação pelo id
SELECT * FROM "reviews" WHERE "id" = $1;
-- UPDATE: atualiza avaliação pelo id
UPDATE "reviews"
SET "domain" = $2::"ReviewDomain",
    "subject_id" = $3,
    "target_id" = $4,
    "target_name" = $5,
    "user_id" = $6,
    "rating" = $7,
    "comment" = $8,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove avaliação pelo id
DELETE FROM "reviews" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: review_aggregates
SELECT 'review_aggregates' AS entity;
-- CREATE: cria agregação de avaliações por alvo
INSERT INTO "review_aggregates" ("id", "domain", "target_id", "average_rating", "reviews_count", "updated_at")
VALUES ($1, $2::"ReviewDomain", $3, $4, $5, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista agregados por atualização
SELECT * FROM "review_aggregates" ORDER BY "updated_at" DESC;
-- READ (por PK): busca agregado pelo id
SELECT * FROM "review_aggregates" WHERE "id" = $1;
-- UPDATE: atualiza agregado pelo id
UPDATE "review_aggregates"
SET "domain" = $2::"ReviewDomain",
    "target_id" = $3,
    "average_rating" = $4,
    "reviews_count" = $5,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove agregado pelo id
DELETE FROM "review_aggregates" WHERE "id" = $1 RETURNING *;

-- MÓDULO: hosting
-- Marcador de módulo (útil para separar o arquivo por domínio)
SELECT 'hosting' AS module;

-- ENTIDADE/TABELA: hosting_chalets
SELECT 'hosting_chalets' AS entity;
-- CREATE: cria chalé
INSERT INTO "hosting_chalets" (
  "id", "codigo", "nome", "descricao", "comodidades", "comodos", "observacoes", "tipo_unidade", "status",
  "preco_base", "average_rating", "reviews_count", "max_hospedes", "ativo",
  "created_at", "updated_at", "deleted_at"
)
VALUES (
  $1, $2, $3, $4, $5::text[], $6::text[], $7, $8::"ChaleType", $9::"ChaleStatus",
  $10, $11, $12, $13, $14,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $15
)
RETURNING *;
-- READ (lista): lista chalés não deletados por data de criação
SELECT * FROM "hosting_chalets" WHERE "deleted_at" IS NULL ORDER BY "created_at" DESC;
-- READ (por PK): busca chalé pelo id
SELECT * FROM "hosting_chalets" WHERE "id" = $1;
-- UPDATE: atualiza chalé pelo id
UPDATE "hosting_chalets"
SET "codigo" = $2,
    "nome" = $3,
    "descricao" = $4,
    "comodidades" = $5::text[],
    "comodos" = $6::text[],
    "observacoes" = $7,
    "tipo_unidade" = $8::"ChaleType",
    "status" = $9::"ChaleStatus",
    "preco_base" = $10,
    "average_rating" = $11,
    "reviews_count" = $12,
    "max_hospedes" = $13,
    "ativo" = $14,
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_at" = $15
WHERE "id" = $1
RETURNING *;
-- DELETE: remove chalé pelo id
DELETE FROM "hosting_chalets" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_amenities
SELECT 'hosting_amenities' AS entity;
-- CREATE: cria comodidade
INSERT INTO "hosting_amenities" ("id", "nome", "descricao", "created_at", "updated_at")
VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista comodidades por data de criação
SELECT * FROM "hosting_amenities" ORDER BY "created_at" DESC;
-- READ (por PK): busca comodidade pelo id
SELECT * FROM "hosting_amenities" WHERE "id" = $1;
-- UPDATE: atualiza comodidade pelo id
UPDATE "hosting_amenities"
SET "nome" = $2,
    "descricao" = $3,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove comodidade pelo id
DELETE FROM "hosting_amenities" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_chalet_amenities
SELECT 'hosting_chalet_amenities' AS entity;
-- CREATE: vincula chalé a uma comodidade
INSERT INTO "hosting_chalet_amenities" ("id", "chale_id", "comodidade_id", "created_at")
VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista vínculos por data de criação
SELECT * FROM "hosting_chalet_amenities" ORDER BY "created_at" DESC;
-- READ (por PK): busca vínculo pelo id
SELECT * FROM "hosting_chalet_amenities" WHERE "id" = $1;
-- UPDATE: atualiza vínculo pelo id
UPDATE "hosting_chalet_amenities"
SET "chale_id" = $2,
    "comodidade_id" = $3
WHERE "id" = $1
RETURNING *;
-- DELETE: remove vínculo pelo id
DELETE FROM "hosting_chalet_amenities" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_chalet_images
SELECT 'hosting_chalet_images' AS entity;
-- CREATE: adiciona imagem do chalé
INSERT INTO "hosting_chalet_images" (
  "id", "chale_id", "image_url", "image_key", "file_size_bytes", "mime_type", "position", "created_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista imagens do chalé por data
SELECT * FROM "hosting_chalet_images" ORDER BY "created_at" DESC;
-- READ (por PK): busca imagem pelo id
SELECT * FROM "hosting_chalet_images" WHERE "id" = $1;
-- UPDATE: atualiza imagem do chalé pelo id
UPDATE "hosting_chalet_images"
SET "chale_id" = $2,
    "image_url" = $3,
    "image_key" = $4,
    "file_size_bytes" = $5,
    "mime_type" = $6,
    "position" = $7
WHERE "id" = $1
RETURNING *;
-- DELETE: remove imagem pelo id
DELETE FROM "hosting_chalet_images" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_chalet_availability
SELECT 'hosting_chalet_availability' AS entity;
-- CREATE: cria registro de disponibilidade do chalé (por data)
INSERT INTO "hosting_chalet_availability" (
  "id", "chale_id", "reference_date", "status", "reservation_id", "block_id", "notes", "created_at", "updated_at"
)
VALUES (
  $1, $2, $3, $4::"ChaleStatus", $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista disponibilidade por data de referência
SELECT * FROM "hosting_chalet_availability" ORDER BY "reference_date" DESC;
-- READ (por PK): busca disponibilidade pelo id
SELECT * FROM "hosting_chalet_availability" WHERE "id" = $1;
-- UPDATE: atualiza disponibilidade pelo id
UPDATE "hosting_chalet_availability"
SET "chale_id" = $2,
    "reference_date" = $3,
    "status" = $4::"ChaleStatus",
    "reservation_id" = $5,
    "block_id" = $6,
    "notes" = $7,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove registro de disponibilidade pelo id
DELETE FROM "hosting_chalet_availability" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_pricing_rules
SELECT 'hosting_pricing_rules' AS entity;
-- CREATE: cria regra de preço de hospedagem
INSERT INTO "hosting_pricing_rules" (
  "id", "nome", "tipo_regra", "percentual", "data_inicio", "data_fim",
  "aplica_todos", "ativo", "criado_por", "atualizado_por", "created_at", "updated_at", "deleted_at"
)
VALUES (
  $1, $2, $3::"PriceRuleType", $4, $5, $6,
  $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $11
)
RETURNING *;
-- READ (lista): lista regras não deletadas por data de início
SELECT * FROM "hosting_pricing_rules" WHERE "deleted_at" IS NULL ORDER BY "data_inicio" DESC;
-- READ (por PK): busca regra pelo id
SELECT * FROM "hosting_pricing_rules" WHERE "id" = $1;
-- UPDATE: atualiza regra pelo id
UPDATE "hosting_pricing_rules"
SET "nome" = $2,
    "tipo_regra" = $3::"PriceRuleType",
    "percentual" = $4,
    "data_inicio" = $5,
    "data_fim" = $6,
    "aplica_todos" = $7,
    "ativo" = $8,
    "criado_por" = $9,
    "atualizado_por" = $10,
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_at" = $11
WHERE "id" = $1
RETURNING *;
-- DELETE: remove regra pelo id
DELETE FROM "hosting_pricing_rules" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_pricing_rule_chalets
SELECT 'hosting_pricing_rule_chalets' AS entity;
-- CREATE: vincula regra de preço a um chalé
INSERT INTO "hosting_pricing_rule_chalets" ("id", "regra_id", "chale_id", "created_at")
VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista vínculos por data de criação
SELECT * FROM "hosting_pricing_rule_chalets" ORDER BY "created_at" DESC;
-- READ (por PK): busca vínculo pelo id
SELECT * FROM "hosting_pricing_rule_chalets" WHERE "id" = $1;
-- UPDATE: atualiza vínculo pelo id
UPDATE "hosting_pricing_rule_chalets"
SET "regra_id" = $2,
    "chale_id" = $3
WHERE "id" = $1
RETURNING *;
-- DELETE: remove vínculo pelo id
DELETE FROM "hosting_pricing_rule_chalets" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: cancellation_policies
SELECT 'cancellation_policies' AS entity;
-- CREATE: cria política de cancelamento
INSERT INTO "cancellation_policies" (
  "id", "name", "free_cancellation_days", "partial_penalty_from_day", "partial_penalty_to_day",
  "partial_penalty_percent", "full_penalty_percent", "terms_version", "terms_content",
  "is_active", "effective_from", "effective_to", "created_by", "created_at", "updated_at"
)
VALUES (
  $1, $2, $3, $4, $5,
  $6, $7, $8, $9,
  $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista políticas por vigência
SELECT * FROM "cancellation_policies" ORDER BY "effective_from" DESC;
-- READ (por PK): busca política pelo id
SELECT * FROM "cancellation_policies" WHERE "id" = $1;
-- UPDATE: atualiza política pelo id
UPDATE "cancellation_policies"
SET "name" = $2,
    "free_cancellation_days" = $3,
    "partial_penalty_from_day" = $4,
    "partial_penalty_to_day" = $5,
    "partial_penalty_percent" = $6,
    "full_penalty_percent" = $7,
    "terms_version" = $8,
    "terms_content" = $9,
    "is_active" = $10,
    "effective_from" = $11,
    "effective_to" = $12,
    "created_by" = $13,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove política pelo id
DELETE FROM "cancellation_policies" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_kpis
SELECT 'hosting_kpis' AS entity;
-- CREATE: cria KPI de hospedagem
INSERT INTO "hosting_kpis" ("id", "reference_date", "metric", "value", "metadata", "created_at")
VALUES ($1, $2, $3::"HospedagemKpiType", $4, $5::jsonb, CURRENT_TIMESTAMP)
RETURNING *;
-- READ (lista): lista KPIs por data de referência
SELECT * FROM "hosting_kpis" ORDER BY "reference_date" DESC;
-- READ (por PK): busca KPI pelo id
SELECT * FROM "hosting_kpis" WHERE "id" = $1;
-- UPDATE: atualiza KPI pelo id
UPDATE "hosting_kpis"
SET "reference_date" = $2,
    "metric" = $3::"HospedagemKpiType",
    "value" = $4,
    "metadata" = $5::jsonb
WHERE "id" = $1
RETURNING *;
-- DELETE: remove KPI pelo id
DELETE FROM "hosting_kpis" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_reservations
SELECT 'hosting_reservations' AS entity;
-- CREATE: cria reserva de hospedagem
INSERT INTO "hosting_reservations" (
  "id", "codigo", "chale_id", "user_id", "regra_preco_id", "cancellation_policy_id",
  "status", "origem", "nome_hospede", "email_hospede", "telefone_hospede",
  "data_checkin", "data_checkout", "adultos", "criancas",
  "valor_base", "valor_desconto", "valor_acrescimo", "valor_total",
  "status_pagamento", "metodo_pagamento", "payment_id", "pago_em",
  "checkin_realizado_em", "checkout_realizado_em", "cancelado_em", "no_show_at",
  "no_show_fee_amount", "no_show_reason",
  "vehicle_plate", "vehicle_model", "vehicle_color", "vehicle_type",
  "extra_bed_requested", "extra_bed_fee",
  "negotiation_notes", "contact_channel", "contact_notes",
  "policies_accepted", "policies_accepted_at", "policy_version", "policy_term",
  "motivo_cancelamento", "observacoes",
  "criado_por", "atualizado_por",
  "created_at", "updated_at", "deleted_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6,
  $7::"ReservationStatus", $8::"HostingReservationOrigin", $9, $10, $11,
  $12, $13, $14, $15,
  $16, $17, $18, $19,
  $20::"PaymentStatus", $21, $22, $23,
  $24, $25, $26, $27,
  $28, $29,
  $30, $31, $32, $33,
  $34, $35,
  $36, $37::"HostingContactChannel", $38,
  $39, $40, $41, $42,
  $43, $44,
  $45, $46,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $47
)
RETURNING *;
-- READ (lista): lista reservas não deletadas por data de criação
SELECT * FROM "hosting_reservations" WHERE "deleted_at" IS NULL ORDER BY "created_at" DESC;
-- READ (por PK): busca reserva pelo id
SELECT * FROM "hosting_reservations" WHERE "id" = $1;
-- UPDATE: atualiza reserva pelo id
UPDATE "hosting_reservations"
SET "codigo" = $2,
    "chale_id" = $3,
    "user_id" = $4,
    "regra_preco_id" = $5,
    "cancellation_policy_id" = $6,
    "status" = $7::"ReservationStatus",
    "origem" = $8::"HostingReservationOrigin",
    "nome_hospede" = $9,
    "email_hospede" = $10,
    "telefone_hospede" = $11,
    "data_checkin" = $12,
    "data_checkout" = $13,
    "adultos" = $14,
    "criancas" = $15,
    "valor_base" = $16,
    "valor_desconto" = $17,
    "valor_acrescimo" = $18,
    "valor_total" = $19,
    "status_pagamento" = $20::"PaymentStatus",
    "metodo_pagamento" = $21,
    "payment_id" = $22,
    "pago_em" = $23,
    "checkin_realizado_em" = $24,
    "checkout_realizado_em" = $25,
    "cancelado_em" = $26,
    "no_show_at" = $27,
    "no_show_fee_amount" = $28,
    "no_show_reason" = $29,
    "vehicle_plate" = $30,
    "vehicle_model" = $31,
    "vehicle_color" = $32,
    "vehicle_type" = $33,
    "extra_bed_requested" = $34,
    "extra_bed_fee" = $35,
    "negotiation_notes" = $36,
    "contact_channel" = $37::"HostingContactChannel",
    "contact_notes" = $38,
    "policies_accepted" = $39,
    "policies_accepted_at" = $40,
    "policy_version" = $41,
    "policy_term" = $42,
    "motivo_cancelamento" = $43,
    "observacoes" = $44,
    "criado_por" = $45,
    "atualizado_por" = $46,
    "updated_at" = CURRENT_TIMESTAMP,
    "deleted_at" = $47
WHERE "id" = $1
RETURNING *;
-- DELETE: remove reserva pelo id
DELETE FROM "hosting_reservations" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_chalet_blocks
SELECT 'hosting_chalet_blocks' AS entity;
-- CREATE: cria bloqueio de datas do chalé
INSERT INTO "hosting_chalet_blocks" (
  "id", "chale_id", "data_inicio", "data_fim", "motivo", "observacoes",
  "ativo", "criado_por", "created_at", "updated_at"
)
VALUES (
  $1, $2, $3, $4, $5::"BlockReason", $6,
  $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista bloqueios por data de início
SELECT * FROM "hosting_chalet_blocks" ORDER BY "data_inicio" DESC;
-- READ (por PK): busca bloqueio pelo id
SELECT * FROM "hosting_chalet_blocks" WHERE "id" = $1;
-- UPDATE: atualiza bloqueio pelo id
UPDATE "hosting_chalet_blocks"
SET "chale_id" = $2,
    "data_inicio" = $3,
    "data_fim" = $4,
    "motivo" = $5::"BlockReason",
    "observacoes" = $6,
    "ativo" = $7,
    "criado_por" = $8,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove bloqueio pelo id
DELETE FROM "hosting_chalet_blocks" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_reservation_vouchers
SELECT 'hosting_reservation_vouchers' AS entity;
-- CREATE: cria voucher da reserva (QR Code + instruções)
INSERT INTO "hosting_reservation_vouchers" ("id", "reservation_id", "qr_code", "arrival_instructions", "complex_contacts", "generated_at", "sent_by_email")
VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
RETURNING *;
-- READ (lista): lista vouchers por data de geração
SELECT * FROM "hosting_reservation_vouchers" ORDER BY "generated_at" DESC;
-- READ (por PK): busca voucher pelo id
SELECT * FROM "hosting_reservation_vouchers" WHERE "id" = $1;
-- UPDATE: atualiza voucher pelo id
UPDATE "hosting_reservation_vouchers"
SET "reservation_id" = $2,
    "qr_code" = $3,
    "arrival_instructions" = $4,
    "complex_contacts" = $5,
    "sent_by_email" = $6
WHERE "id" = $1
RETURNING *;
-- DELETE: remove voucher pelo id
DELETE FROM "hosting_reservation_vouchers" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: reservation_guests
SELECT 'reservation_guests' AS entity;
-- CREATE: cria hóspede vinculado à reserva
INSERT INTO "reservation_guests" (
  "id", "reservation_id", "full_name", "email", "phone", "cpf", "rg", "birth_date", "is_primary", "created_at", "updated_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista hóspedes por data de criação
SELECT * FROM "reservation_guests" ORDER BY "created_at" DESC;
-- READ (por PK): busca hóspede pelo id
SELECT * FROM "reservation_guests" WHERE "id" = $1;
-- UPDATE: atualiza hóspede pelo id
UPDATE "reservation_guests"
SET "reservation_id" = $2,
    "full_name" = $3,
    "email" = $4,
    "phone" = $5,
    "cpf" = $6,
    "rg" = $7,
    "birth_date" = $8,
    "is_primary" = $9,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove hóspede pelo id
DELETE FROM "reservation_guests" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_notification_logs
SELECT 'hosting_notification_logs' AS entity;
-- CREATE: cria log de notificação (fila/tentativas/envio)
INSERT INTO "hosting_notification_logs" (
  "id", "reservation_id", "user_id", "channel", "event", "recipient", "payload",
  "status", "attempts", "last_attempt_at", "sent_at", "next_retry_at", "error_message",
  "created_at", "updated_at"
)
VALUES (
  $1, $2, $3, $4::"HostingNotificationChannel", $5, $6, $7::jsonb,
  $8::"HostingNotificationStatus", $9, $10, $11, $12, $13,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista logs por data de criação
SELECT * FROM "hosting_notification_logs" ORDER BY "created_at" DESC;
-- READ (por PK): busca log pelo id
SELECT * FROM "hosting_notification_logs" WHERE "id" = $1;
-- UPDATE: atualiza log pelo id (status/tentativas/erros)
UPDATE "hosting_notification_logs"
SET "reservation_id" = $2,
    "user_id" = $3,
    "channel" = $4::"HostingNotificationChannel",
    "event" = $5,
    "recipient" = $6,
    "payload" = $7::jsonb,
    "status" = $8::"HostingNotificationStatus",
    "attempts" = $9,
    "last_attempt_at" = $10,
    "sent_at" = $11,
    "next_retry_at" = $12,
    "error_message" = $13,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove log pelo id
DELETE FROM "hosting_notification_logs" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_reservation_reviews
SELECT 'hosting_reservation_reviews' AS entity;
-- CREATE: cria avaliação de uma reserva
INSERT INTO "hosting_reservation_reviews" (
  "id", "reservation_id", "chale_id", "user_id", "rating", "comment", "created_at", "updated_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista avaliações por data de criação
SELECT * FROM "hosting_reservation_reviews" ORDER BY "created_at" DESC;
-- READ (por PK): busca avaliação pelo id
SELECT * FROM "hosting_reservation_reviews" WHERE "id" = $1;
-- UPDATE: atualiza avaliação pelo id
UPDATE "hosting_reservation_reviews"
SET "reservation_id" = $2,
    "chale_id" = $3,
    "user_id" = $4,
    "rating" = $5,
    "comment" = $6,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = $1
RETURNING *;
-- DELETE: remove avaliação pelo id
DELETE FROM "hosting_reservation_reviews" WHERE "id" = $1 RETURNING *;

-- ENTIDADE/TABELA: hosting_audit_logs
SELECT 'hosting_audit_logs' AS entity;
-- CREATE: cria log de auditoria (mudanças em reserva/chalé/regras)
INSERT INTO "hosting_audit_logs" (
  "id", "reserva_id", "chale_id", "regra_preco_id", "user_id", "acao",
  "valor_anterior", "valor_novo", "ip_address", "user_agent", "created_at"
)
VALUES (
  $1, $2, $3, $4, $5, $6,
  $7::jsonb, $8::jsonb, $9, $10, CURRENT_TIMESTAMP
)
RETURNING *;
-- READ (lista): lista logs por data de criação
SELECT * FROM "hosting_audit_logs" ORDER BY "created_at" DESC;
-- READ (por PK): busca log pelo id
SELECT * FROM "hosting_audit_logs" WHERE "id" = $1;
-- UPDATE: atualiza log pelo id
UPDATE "hosting_audit_logs"
SET "reserva_id" = $2,
    "chale_id" = $3,
    "regra_preco_id" = $4,
    "user_id" = $5,
    "acao" = $6,
    "valor_anterior" = $7::jsonb,
    "valor_novo" = $8::jsonb,
    "ip_address" = $9,
    "user_agent" = $10
WHERE "id" = $1
RETURNING *;
-- DELETE: remove log pelo id
DELETE FROM "hosting_audit_logs" WHERE "id" = $1 RETURNING *;
