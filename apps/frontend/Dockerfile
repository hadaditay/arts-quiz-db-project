# syntax=docker/dockerfile:1
FROM node:18-bullseye-slim AS builder
WORKDIR /app

# Install workspace dependencies
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

# Build frontend (API URL can be overridden at build time)
ARG VITE_API_BASE_URL=http://localhost:4000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY . .
RUN npm run build --workspace apps/frontend

FROM node:18-bullseye-slim AS runtime
WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/apps/frontend/dist ./dist

EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173", "--single"]
