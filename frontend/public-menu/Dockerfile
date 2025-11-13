FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY frontend/public-menu/package*.json ./frontend/public-menu/
COPY libs/shared-types/package*.json ./libs/shared-types/

RUN npm install

COPY tsconfig.base.json ./
COPY libs/shared-types ./libs/shared-types
COPY frontend/public-menu ./frontend/public-menu

WORKDIR /app/libs/shared-types
RUN npm run build

WORKDIR /app/frontend/public-menu
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/frontend/public-menu/package*.json ./
COPY --from=builder /app/frontend/public-menu/.next ./.next
COPY --from=builder /app/frontend/public-menu/public ./public
COPY --from=builder /app/frontend/public-menu/next.config.js ./

RUN npm install --only=production

EXPOSE 3002

CMD ["npm", "start"]
