# 1. Etapa de Construção (Build)
FROM node:20-alpine AS builder

WORKDIR /app

# Instala OpenSSL (Necessário para o Prisma funcionar bem no Linux)
RUN apk add --no-cache openssl

# Copia os arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências
RUN npm install

# Copia todo o resto do código
COPY . .

# Gera o cliente do Prisma (Usando URL dummy apenas para gerar os arquivos)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Constrói o projeto NestJS
RUN npm run build

# 2. Etapa de Produção (Imagem final)
FROM node:20-alpine

WORKDIR /app

# Instala OpenSSL na imagem de produção também
RUN apk add --no-cache openssl

# Copia apenas o necessário da etapa anterior
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Comando final: Roda a migração e inicia o servidor
CMD [ "sh", "-c", "npx prisma migrate deploy && npm run start:prod" ]