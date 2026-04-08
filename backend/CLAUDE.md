# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev   # Run locally (needs PostgreSQL on :5432)
./mvnw test                                              # Run all tests
./mvnw test -Dtest=GoalServiceTest                       # Run a single test class
./mvnw package -DskipTests                               # Build JAR
```

Tests use H2 in-memory — no external database needed.

## Package structure

```
com.picsou/
├── model/        JPA entities
├── repository/   Spring Data JPA interfaces
├── service/      Business logic
├── controller/   REST controllers (all routes under /api/)
├── dto/          Request/response records
├── port/         Abstractions for external providers
├── adapter/      Port implementations (Enable Banking, CoinGecko, Yahoo Finance)
├── config/       Spring beans: security, JWT, rate limiting, properties
└── exception/    GlobalExceptionHandler + custom exceptions
```

## Key patterns

**Ports & adapters:** External integrations hide behind `BankConnectorPort` and `PriceProviderPort`. To swap a provider, implement the port and swap the `@Primary` bean — controllers/services never import adapters directly.

**Auth flow:** `JwtAuthenticationFilter` reads the `access_token` HttpOnly cookie and sets the `SecurityContext`. `AuthController` issues and rotates tokens. CSRF is disabled — SameSite=Strict cookies provide equivalent protection.

**Rate limiting:** `RateLimitConfig` configures Bucket4j buckets; the actual enforcement is in the controllers via annotations. Login: 5 attempts/15 min. Sync endpoints are also throttled.

**Scheduled tasks** (`SchedulerService`): daily balance snapshots and price cache refresh. `PriceService` holds a 15-minute in-memory cache to avoid hammering external APIs.

**Flyway owns the schema** — never use `ddl-auto: create/update`. Migration details and entity conventions: see [`docs/conventions/database.md`](../docs/conventions/database.md).

## Configuration

`application.yml` (prod), `application-dev.yml` (dev, enables SQL logging). All secrets from env vars — see `.env.example` at project root.

## Testing

Mockito unit tests (`@ExtendWith(MockitoExtension.class)`), `@DataJpaTest` with H2 for integration. Full conventions: see [`docs/conventions/testing.md`](../docs/conventions/testing.md).
