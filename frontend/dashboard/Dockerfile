FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY frontend/dashboard/package*.json ./frontend/dashboard/
COPY libs/shared-types/package*.json ./libs/shared-types/

RUN npm install

COPY tsconfig.base.json ./
COPY libs/shared-types ./libs/shared-types
COPY frontend/dashboard ./frontend/dashboard

WORKDIR /app/libs/shared-types
RUN npm run build

WORKDIR /app/frontend/dashboard
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/frontend/dashboard/package*.json ./
COPY --from=builder /app/frontend/dashboard/.next ./.next
COPY --from=builder /app/frontend/dashboard/public ./public
COPY --from=builder /app/frontend/dashboard/next.config.js ./

RUN npm install --only=production

EXPOSE 3000

CMD ["npm", "start"]
