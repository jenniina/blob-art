# Dockerfile for blob-art (multi-stage: build frontend, then run backend)

# ---------- FRONTEND BUILD STAGE ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# ---------- BACKEND BUILD STAGE ----------
FROM node:20-alpine AS backend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Build backend TypeScript
RUN npm run build || true

# ---------- FINAL STAGE ----------
FROM node:20-alpine AS production
WORKDIR /app
# Copy backend code and node_modules
COPY --from=backend-build /app /app
# Copy built frontend
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist 
EXPOSE 4000 
CMD ["node", "dist/src/app.js"]
