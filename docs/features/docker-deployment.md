# Feature: Docker deployment (all-in-one image)

> Last updated: 2026-04-16

## Context

Picsou ships as a single Docker image containing three processes: the React frontend (served by Nginx), the Spring Boot backend (JVM), and the tr-auth Python microservice (uvicorn). A `docker-compose.yml` orchestrates the image alongside a PostgreSQL 16 container.

## How it works

### Multi-stage build (3 stages)

1. **`frontend-build`** — `oven/bun:alpine`. Installs deps from `bun.lock` via `bun install --frozen-lockfile`, runs `bun run build` (tsc + Vite). Output: `dist/`.
2. **`backend-build`** — `maven:3.9-eclipse-temurin-21-alpine`. Copies `pom.xml` first for layer caching (`mvn dependency:go-offline`), then source, then `mvn package -DskipTests`. Output: single fat JAR.
3. **Runtime** — `mcr.microsoft.com/playwright/python:v1.44.0-jammy` (needed for tr-auth's Playwright dependency). Installs Nginx + Temurin JRE 21 + supervisor. Copies artifacts from both build stages plus config files.

### Process supervision

`supervisord` manages three processes in the single container:

| Process | Port | Role |
|---------|------|------|
| Nginx | 8080 (public) | Serves frontend SPA, proxies `/api/*` and `/actuator` to backend |
| Java (Spring Boot) | 9090 (internal) | Backend API |
| uvicorn (tr-auth) | 8001 (internal) | Trade Republic auth microservice |

Nginx config in `docker/nginx.conf` handles SPA routing (`try_files`), API proxying, static asset caching, and security headers.

### Entrypoint

`docker/entrypoint.sh` sets `SERVER_PORT=9090` and `TR_AUTH_URL=http://127.0.0.1:8001`, then execs supervisord.

### Key files

- `docker/Dockerfile` — multi-stage build definition
- `docker/docker-compose.yml` — orchestration (app + PostgreSQL + volume)
- `docker/nginx.conf` — Nginx reverse proxy config
- `docker/supervisord.conf` — process supervision
- `docker/entrypoint.sh` — container entrypoint
- `.dockerignore` — excludes build artifacts, secrets, docs, and the Dockerfile itself

### Flow

```
docker compose up
  -> builds docker/Dockerfile (context: project root)
  -> app container (nginx:8080 -> backend:9090, tr-auth:8001)
  -> db container (PostgreSQL 16)
```

## Technical choices

| Choice | Why | Rejected alternative |
|--------|-----|----------------------|
| Bun for frontend build | Project uses bun exclusively (`bun.lock`, no `package-lock.json`) | npm (would require a separate lock file or unreliable resolution) |
| Single image with supervisor | Simpler deployment, one container to manage | Separate containers per service (more complex compose, more overhead) |
| Playwright base image | tr-auth needs Playwright for Trade Republic auth flow | Slim image + manual Playwright install (harder to maintain) |
| `.dockerignore` excludes `docker/Dockerfile` | Prevents the Dockerfile from being part of its own build context | No exclusion (harmless but unnecessary) |

## Gotchas / Pitfalls

- **`.dockerignore` must NOT exclude `docker/` entirely.** The runtime stage copies `docker/nginx.conf`, `docker/supervisord.conf`, and `docker/entrypoint.sh` from the build context. Only `docker/Dockerfile` and `docker-compose*.yml` should be excluded.
- **Frontend lock file is `bun.lock`, not `package-lock.json`.** The Dockerfile must use `oven/bun` image and `bun install --frozen-lockfile`. Using npm will fail.
- **`VITE_DEMO_MODE` build arg** defaults to `false`. Pass `--build-arg VITE_DEMO_MODE=true` to enable demo mode in the built image.
- **Nginx listens on 8080**, backend on 9090 internally. The backend port is set via `SERVER_PORT` env var in `entrypoint.sh`, not in `application.yml`.
- **Runtime image is large** (~1.5 GB+) because of Playwright. Only tr-auth needs it. If tr-auth is ever externalized, the base image can be switched to a lightweight one.

## Tests

- No dedicated Docker integration tests. Build validation is manual: `docker build -f docker/Dockerfile .`.
- Backend unit tests run separately via `./mvnw test` (not in Docker build — skipped with `-DskipTests`).

## Links

- Related: [Trade Republic feature](./trade-republic.md) (tr-auth microservice)
