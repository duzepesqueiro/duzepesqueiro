#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  DB_WAIT_MAX_RETRIES="${DB_WAIT_MAX_RETRIES:-45}"
  DB_WAIT_INTERVAL_SECONDS="${DB_WAIT_INTERVAL_SECONDS:-2}"
  DB_WAIT_RETRY=0
  until echo "SELECT 1;" | npx prisma db execute --stdin --schema prisma/schema.prisma >/dev/null 2>&1; do
    DB_WAIT_RETRY=$((DB_WAIT_RETRY + 1))
    echo "Aguardando PostgreSQL... (${DB_WAIT_RETRY}/${DB_WAIT_MAX_RETRIES})"
    if [ "$DB_WAIT_RETRY" -ge "$DB_WAIT_MAX_RETRIES" ]; then
      echo "Não foi possível conectar ao banco após ${DB_WAIT_MAX_RETRIES} tentativas."
      exit 1
    fi
    sleep "$DB_WAIT_INTERVAL_SECONDS"
  done
else
  echo "DATABASE_URL não definida."
  exit 1
fi

npx prisma generate

if [ "${NODE_ENV:-development}" = "production" ]; then
  npx prisma migrate deploy
else
  if ! npx prisma migrate deploy; then
    echo "Falha no migrate deploy em desenvolvimento, aplicando db push."
    npx prisma db push
  fi
fi

exec "$@"
