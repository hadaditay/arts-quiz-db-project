# syntax=docker/dockerfile:1
FROM node:18-bullseye-slim AS builder
WORKDIR /app

# Install workspace dependencies
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

# Build backend
COPY . .
RUN npm run build --workspace apps/backend

FROM node:18-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Allow Node to resolve extensionless ESM imports after build.
ENV NODE_OPTIONS=--experimental-specifier-resolution=node

# Keep node_modules (includes dev deps for ETL) and runtime artifacts
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
# Include source for dev/ETL commands like `npm run etl`.
COPY --from=builder /app/apps/backend/src ./apps/backend/src
COPY --from=builder /app/apps/backend/tsconfig.json ./apps/backend/tsconfig.json

EXPOSE 4000
CMD ["npm", "--workspace", "apps/backend", "run", "start"]
