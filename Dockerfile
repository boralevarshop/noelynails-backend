# 1. Etapa de Construção (Build)
FROM node:20-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências
RUN npm install

# Copia todo o resto do código
COPY . .

# CORREÇÃO: Definimos uma URL fictícia (dummy) nesta linha.
# O Prisma precisa dela apenas para validar o schema e gerar os arquivos.
# Não se preocupe: ela não será usada para conectar no banco real.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Constrói o projeto NestJS
RUN npm run build

# 2. Etapa de Produção (Imagem final)
FROM node:20-alpine

WORKDIR /app

# Copia apenas o necessário da etapa anterior
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Comando final: Roda a migração (usando a URL REAL do EasyPanel) e inicia
CMD [ "sh", "-c", "npx prisma migrate deploy && npm run start:prod" ]