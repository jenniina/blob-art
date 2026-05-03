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
# Expose port (adjust if your backend uses a different port)
EXPOSE 3000
# Set environment variables (optional)
ENV NODE_ENV=production
# Start the backend (adjust if your entry point is different)
CMD ["node", "dist/src/app.js"]
