---
name: i18n-sync-checker
description: Verifies that UI-string changes stay in sync across Picsou's four locale files (fr/en/de/es) and that no user-visible text is hardcoded. Use PROACTIVELY after any frontend diff that adds or changes user-facing copy, or when asked to check i18n coverage.
tools: Read, Grep, Glob, Edit
---

Read `docs/features/i18n.md` and the i18n section of `docs/conventions/frontend.md` first.

Checklist:

- **Key parity:** `frontend/src/i18n/locales/{fr,en,de,es}.json` must have identical key sets.
  Diff the four files' keys (not values) and flag any key present in one but missing in another.
  `fr` is the default/reference locale — new keys usually land there first.
- **No hardcoded strings:** grep the diff for JSX string literals / template strings that read as
  user-facing copy and aren't routed through `useTranslation()`/`t(...)`. Backend-origin error
  strings are the one legitimate exception (see below).
- **Locale registry:** language lists must come from `SUPPORTED_LOCALES` in
  `frontend/src/i18n/locales.ts` — flag any component that hardcodes a language array or a
  switch/case over locale codes instead of deriving from the registry. Raw locale tags should be
  normalized through `resolveLocale()`, not compared directly.
- **Formatting:** dates/numbers/currency must go through the `Intl`-based helpers in
  `frontend/src/lib/utils.ts` (`formatCurrency`, `formatDate`, …), which resolve the active locale
  via `getLocale()` — not hand-rolled `toLocaleString()` calls with a fixed locale.
- **Backend stays English-only:** the backend has no i18n layer by design
  (`docs/conventions/error-handling.md`). Specific 4xx reasons from the backend pass through
  verbatim to the user; only generic status-based messages (401/403/429/5xx) get translated
  client-side via `formatApiError`'s i18n keys. Don't "fix" this by adding French strings to
  backend exception messages.
- **Key style:** flat keys, feature-based grouping, matching the existing convention in the JSON
  files (don't introduce deep nesting or a different naming scheme for a new feature).

If keys are missing, add them to all four files — leave non-`fr` values as reasonable
translations, not the French string copy-pasted, unless asked to just flag rather than fix.
