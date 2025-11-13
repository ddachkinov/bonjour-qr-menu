FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY api/package*.json ./api/
COPY libs/shared-types/package*.json ./libs/shared-types/

RUN npm install

COPY tsconfig.base.json ./
COPY libs/shared-types ./libs/shared-types
COPY api ./api

WORKDIR /app/libs/shared-types
RUN npm run build

WORKDIR /app/api
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/api/package*.json ./
RUN npm install --only=production

COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/libs/shared-types/dist ./node_modules/@qrmenu/shared-types/dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
