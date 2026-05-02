FROM node:20-bookworm-slim AS build

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/docker/entrypoint.sh /entrypoint.sh

# Prisma CLI fica em devDependencies; copia somente o necessario para migrate/seed no runtime.
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/main.js"]