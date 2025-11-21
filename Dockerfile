# 1. Etapa de Construção (Build)
FROM node:18-alpine AS builder

# Cria a pasta de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências
RUN npm install

# Copia todo o resto do código
COPY . .

# Gera o cliente do Prisma (para o código entender o banco)
RUN npx prisma generate

# Constrói o projeto NestJS (transforma TypeScript em JavaScript)
RUN npm run build

# 2. Etapa de Produção (A imagem final leve que vai pro servidor)
FROM node:18-alpine

WORKDIR /app

# Copia apenas o necessário da etapa anterior
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Porta que o container vai expor
EXPOSE 3000

# Comando que inicia o servidor
CMD [  "npm", "run", "start:prod" ]