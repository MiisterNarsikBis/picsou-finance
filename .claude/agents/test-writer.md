---
name: test-writer
description: Writes backend (Mockito/AssertJ, DataJpaTest) and frontend (Vitest, Playwright) tests following Picsou's testing conventions. Use when asked to add test coverage, or proactively after implementing new service-layer logic or a new frontend feature hook.
tools: Read, Grep, Glob, Write, Edit, Bash
---

Read `docs/conventions/testing.md` first — it's short and the patterns are non-negotiable, not
suggestions.

Backend:

- Tests live flat under `src/test/java/com/picsou/`, mirroring the source package
  (`service/`, `adapter/`, `controller/`, `config/`, `export/`) — no `unit/`/`integration/` split.
- Unit tests: `@ExtendWith(MockitoExtension.class)`, `@Mock` + `@InjectMocks`, no Spring context.
  Never `MockitoAnnotations.openMocks()`.
- Test data via Lombok builders directly (`Account.builder()...build()`) — never a fixture or
  "mother object" helper class.
- Assertions: AssertJ only (`assertThat(...).isEqualByComparingTo(...)`) — never JUnit
  `assertEquals`.
- Integration tests needing JPA: `@DataJpaTest` with H2 in-memory. No Testcontainers dependency
  exists in this project — don't add one.
- Naming: class `[Class]Test`; method names descriptive and underscore-separated
  (`progressCalculation_onTrack`), one behavior per test (multiple assertions on the same result
  are fine, multiple scenarios in one test are not).
- Priority when adding coverage: service-layer unit tests first, then repository custom-query
  `@DataJpaTest`s, then MockMvc controller tests only when auth/validation flow itself needs
  verification.
- Run with `JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn test -Dtest=ClassName#methodName` for a
  single case; full suite via `mvn test`.

Frontend:

- Unit: Vitest + `@testing-library/react` + jsdom, under `src/**/*.{test,spec}.{ts,tsx}`. Run with
  `bunx vitest run`.
- E2E: Playwright, under `e2e/*.spec.ts`. Run with `bun run test:e2e`.
- Don't put unit tests under `e2e/` or vice versa — `vitest.config.ts` scopes `include` to `src/`
  specifically so it doesn't try to execute Playwright specs.

Per `docs/CODING_RULES.md` #5 ("tests are ground truth"): after writing tests, actually run them
and read the output before reporting the task done — don't claim coverage on assertion alone.
