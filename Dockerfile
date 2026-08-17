FROM oven/bun:1 AS base

# Definir o diretório de trabalho
WORKDIR /app

# Etapa de dependências
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Etapa de desenvolvimento
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# Etapa de build para produção
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A compilação é feita baseada no seu script "build"
RUN bun run build

# Etapa de produção
FROM base AS runner
# Em produção vamos usar a imagem base e rodar o preview/server gerado
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app ./

ENV NODE_ENV=production
EXPOSE 3000

# O preview do Vite serve para rodar o build localmente e em containers de forma simples
CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "3000"]
