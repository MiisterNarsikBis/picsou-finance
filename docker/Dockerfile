# ============================================================
# Picsou — All-in-one Docker image (frontend + backend + tr-auth)
# Build context: project root (..)
# ============================================================

# ---------- Stage 1: Build frontend ----------
FROM oven/bun:alpine AS frontend-build

WORKDIR /build/frontend

ARG VITE_DEMO_MODE=false
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE

COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

COPY frontend/ .
RUN bun run build

# ---------- Stage 2: Build backend ----------
FROM maven:3.9-eclipse-temurin-21-alpine AS backend-build

WORKDIR /build/backend

COPY backend/pom.xml .
RUN mvn dependency:go-offline -q

COPY backend/src ./src
RUN mvn package -DskipTests -q

# ---------- Stage 3: Runtime ----------
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

# Install Nginx, Eclipse Temurin JRE 21, supervisor
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        wget \
        gpg \
    && mkdir -p /etc/apt/keyrings \
    && wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | \
        gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb $(. /etc/os-release && echo $VERSION_CODENAME) main" \
        > /etc/apt/sources.list.d/adoptium.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends temurin-21-jre \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install tr-auth Python dependencies
COPY services/tr-auth/requirements.txt /app/tr-auth/requirements.txt
RUN pip install --no-cache-dir -r /app/tr-auth/requirements.txt
COPY services/tr-auth/main.py /app/tr-auth/main.py

# Copy built frontend
COPY --from=frontend-build /build/frontend/dist /usr/share/nginx/html

# Copy built backend
COPY --from=backend-build /build/backend/target/*.jar /app/app.jar

# Copy configs
COPY docker/nginx.conf /etc/nginx/sites-available/picsou
RUN rm -f /etc/nginx/sites-enabled/default \
    && ln -s /etc/nginx/sites-available/picsou /etc/nginx/sites-enabled/picsou

COPY docker/supervisord.conf /etc/supervisor/conf.d/picsou.conf
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
