#!/bin/sh
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL nao definida. Encerrando inicializacao."
  exit 1
fi

DB_WAIT_MAX_RETRIES="${DB_WAIT_MAX_RETRIES:-45}"
DB_WAIT_INTERVAL_SECONDS="${DB_WAIT_INTERVAL_SECONDS:-2}"
DB_WAIT_RETRY=0

echo "Validando conexao com banco de dados..."
until echo "SELECT 1;" | npx prisma db execute --stdin --schema prisma/schema.prisma >/dev/null 2>&1; do
  DB_WAIT_RETRY=$((DB_WAIT_RETRY + 1))
  echo "Aguardando banco... (${DB_WAIT_RETRY}/${DB_WAIT_MAX_RETRIES})"
  if [ "$DB_WAIT_RETRY" -ge "$DB_WAIT_MAX_RETRIES" ]; then
    echo "Nao foi possivel conectar ao banco apos ${DB_WAIT_MAX_RETRIES} tentativas."
    exit 1
  fi
  sleep "$DB_WAIT_INTERVAL_SECONDS"
done

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Executando prisma migrate deploy..."
  npx prisma migrate deploy
else
  echo "RUN_MIGRATIONS=false, pulando migrations."
fi

if [ "${RUN_PRISMA_SEED:-false}" = "true" ]; then
  echo "RUN_PRISMA_SEED=true, executando seed..."
  if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['prisma:seed'] ? 0 : 1)"; then
    npm run prisma:seed
  elif node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.seed ? 0 : 1)"; then
    npm run seed
  else
    echo "Nenhum script de seed encontrado (prisma:seed ou seed). Pulando seed."
  fi
else
  echo "RUN_PRISMA_SEED=false, pulando seed."
fi

exec "$@"
