# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
EXPOSE 3000 3001
CMD ["npm", "run", "dev"]

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "dist/server.js"]
