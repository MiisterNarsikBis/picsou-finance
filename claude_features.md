# claude_features.md

Claude Code features that are relevant to Picsou, and the custom subagents configured for this
repository. Companion to `CLAUDE.md` / `AGENTS.md` (project/stack guidance) — this file is about
the *tooling* layered on top, not the product.

## Already in use in this repo

- **`CLAUDE.md` hierarchy** — root `CLAUDE.md` + `backend/CLAUDE.md` + `frontend/CLAUDE.md` give
  Claude Code scoped context automatically depending on which part of the codebase is touched.
- **`.claude/commands/`** — three custom slash commands already exist and encode this project's
  documentation workflow:
  - `/document` — write or update a `docs/features/*.md` note for the feature just worked on.
  - `/decision` — record a new ADR in `docs/decisions/` from the current conversation.
  - `/coherence` — read-only audit of the whole `docs/` tree against the actual codebase (dead
    links, stale commands, version drift, missing env vars, index completeness).

  These map directly to the workflow described in `CLAUDE.md`'s "Development workflow" section —
  the commands exist so that workflow doesn't rely on remembering to do it manually.

## New: subagents (`.claude/agents/`)

Subagents are separate context windows Claude Code can delegate a sub-task to. Unlike the slash
commands above (which drive documentation), these are review/writing specialists scoped to a
specific Picsou concern — each one is grounded in the actual convention docs (`docs/conventions/`,
`docs/CODING_RULES.md`, `docs/decisions/`) rather than generic best practices, so their findings
cite this repo's actual rules, not textbook advice.

| Agent | Use for | Reads |
|---|---|---|
| `backend-reviewer` | Reviewing Java/Spring diffs: ports & adapters, member scoping, error handling, DB conventions | `backend/CLAUDE.md`, `api-rest.md`, `error-handling.md`, `database.md` |
| `frontend-reviewer` | Reviewing React/TS diffs: state layering, React Compiler rules, shadcn theme tokens, i18n | `frontend/CLAUDE.md`, `conventions/frontend.md` |
| `migration-writer` | Writing new Flyway migrations with correct numbering/naming/constraints | `conventions/database.md` |
| `security-auditor` | Auditing auth/JWT/2FA/encryption/CORS changes against ADRs and past incidents | `docs/decisions/*`, `docs/lessons/*`, security feature notes |
| `test-writer` | Writing backend (Mockito/AssertJ) or frontend (Vitest/Playwright) tests in the project's exact style | `conventions/testing.md` |
| `i18n-sync-checker` | Verifying new UI copy lands in all 4 locale files (fr/en/de/es) and nothing is hardcoded | `docs/features/i18n.md` |
| `api-contract-guardian` | Keeping `frontend/src/types/api.ts` and `backend/docs/API.md` in sync with backend DTOs | `conventions/api-rest.md` |
| `adr-prior-art-checker` | Checking `docs/decisions/` and `docs/lessons/` for prior art before a new architectural proposal | `docs/INDEX.md`, `docs/decisions/*` |

Each is defined with YAML frontmatter (`name`, `description`, `tools`) plus a body that reads like
a targeted checklist rather than a generic prompt — descriptions are written so Claude Code can
invoke them **proactively** (e.g. `backend-reviewer` after a controller/service diff,
`security-auditor` before merging anything auth-related) without being asked by name, and they can
also be invoked explicitly ("use the migration-writer agent to add the `debt_category` column").

Reviewer agents (`backend-reviewer`, `frontend-reviewer`, `security-auditor`,
`api-contract-guardian`) are intentionally read-only-ish (`Read, Grep, Glob, Bash` — no `Edit`)
so they report findings rather than silently rewriting code; writer agents (`migration-writer`,
`test-writer`, `i18n-sync-checker`) carry `Edit`/`Write` because producing the artifact *is* the
task. `adr-prior-art-checker` has no write tools at all — it's a research step that feeds a human
decision, not a decision-maker itself.

## Other Claude Code features worth knowing about for this project

- **Hooks** (`.claude/settings.json`) — not configured yet. A natural fit here would be a
  `PreToolUse`/`PostToolUse` hook that runs `bun run lint` after frontend edits or blocks a commit
  containing a hand-edited file under `frontend/src/components/ui/` (Coding Rule #1 is currently
  enforced only by convention/review, not tooling).
- **MCP client** — Claude Code itself can act as an MCP *client*. Worth noting this is distinct
  from Picsou's own embedded MCP *server* (`docs/features/mcp-server.md`, ADR
  `2026-06-05-access-key-auth-and-embedded-mcp.md`), which lets external AI apps query a member's
  finances via `psk_…` access-keys — a Claude Code session working on this repo and an MCP client
  connecting *to* a running Picsou instance are two unrelated integrations that happen to share a
  protocol.
- **Skills** (`skill-creator`, `code-review`, `security-review`, `verify`, `run`) — general-purpose
  Claude Code skills already available in this environment; `security-review` and `code-review` in
  particular overlap with `security-auditor`/`backend-reviewer`/`frontend-reviewer` above but run
  as slash-command-driven passes over a diff rather than as delegatable agents — use whichever fits
  the moment (a skill for "review my current diff right now", an agent when you want the review to
  run in its own context alongside other work).
