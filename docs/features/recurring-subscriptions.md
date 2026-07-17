# Feature: Recurring Subscriptions

> Last updated: 2026-07-17

## Context

Members had no way to see how much their recurring charges (streaming, gym, insurance...) add up
to, or notice a silent price hike or a subscription that stopped billing. This feature detects
recurring subscriptions from a member's own transaction history — no new integration, no user
input, nothing to configure.

## How it works

`RecurringSubscriptionService.detect(memberId)` computes the result **on the fly** from the
member's outgoing cash transactions, mirroring `RealizedPnlService` / `LoanAmortizationService`:
nothing is persisted, every call recomputes from the transaction stream.

1. `TransactionRepository.findOutgoingCashTransactionsByMemberId` fetches every negative-amount
   transaction on the member's `CHECKING`/`SAVINGS`/`LEP`/`OTHER` accounts (the same "cash account"
   set as manual transactions — see [manual-transactions.md](manual-transactions.md)), ordered by
   date. Investment (`PEA`/`COMPTE_TITRES`/`CRYPTO`) and `LOAN`/`REAL_ESTATE` accounts are excluded
   at the query level.
2. Transactions are grouped by a normalized merchant key: description upper-cased, all digits and
   punctuation stripped. This folds bank-generated reference numbers and dates (e.g.
   `PRLV SEPA NETFLIX.COM 4498217 15/01` and `... 5512890 15/02`) into the same group instead of
   fragmenting one merchant into many.
3. A group becomes a detected subscription when it has at least 3 charges whose intervals cluster
   around a weekly (5–9d), monthly (25–35d), or yearly (350–380d) cadence — at most one interval may
   deviate by more than ±35% of the median, otherwise the group is treated as irregular and dropped.
4. Status:
   - `OVERDUE` — the next expected charge date (last charge + median interval) has been missed by
     more than half a cadence. Checked **first**: a subscription that stopped billing is more
     actionable than a stale price comparison.
   - `PRICE_INCREASED` — otherwise, if the latest charge is more than 5% above the previous one.
   - `ACTIVE` — otherwise.
5. `totalMonthlyCost` sums each subscription's monthly-equivalent cost (weekly ×52/12, yearly ÷12),
   restricted to the *dominant* currency across the member's outgoing transactions (the currency
   with the most transactions, defaulting to EUR). Subscriptions in a different currency are still
   listed individually but excluded from the total to avoid a meaningless cross-currency sum.

### Key files

| File | Role |
|------|------|
| `backend/src/main/java/com/picsou/service/RecurringSubscriptionService.java` | Detection algorithm (grouping, cadence classification, status) |
| `backend/src/main/java/com/picsou/dto/SubscriptionsResponse.java` | Response shape (`Cadence`, `Status` enums) |
| `backend/src/main/java/com/picsou/repository/TransactionRepository.java` | `findOutgoingCashTransactionsByMemberId` |
| `backend/src/main/java/com/picsou/controller/SubscriptionController.java` | `GET /api/subscriptions` |
| `backend/src/main/java/com/picsou/mcp/tools/TransactionTools.java` | `get_subscriptions` MCP tool (`transactions:read` scope) |
| `frontend/src/features/subscriptions/{api,hooks}.ts` | `useSubscriptions()` |
| `frontend/src/pages/subscriptions/SubscriptionsPage.tsx` | `/subscriptions` route — total + per-subscription cards |
| `frontend/src/demo/index.ts` | Demo-mode mock: one `ACTIVE`, one `PRICE_INCREASED`, one `OVERDUE` |

## Technical choices

| Choice | Why | Rejected alternative |
|--------|-----|----------------------|
| Compute on the fly, no new table | Consistent with `RealizedPnlService`/`LoanAmortizationService`; the transaction stream is already the source of truth and stays in sync automatically | Persist a `subscription` table populated by a scheduled job (more moving parts, can drift from the transaction data) |
| Normalize merchant by stripping all digits | Bank descriptions embed reference numbers/dates that differ every charge; keeping any digit threshold (e.g. 3+) still let 1–2 digit day/month fragments leak through and fragment the group | Fuzzy string matching (Levenshtein) — more accurate but a lot more complexity for a first version |
| No dismiss/ignore persistence | Keeps the feature fully stateless; adding a "hide this" flag would require its first bit of persisted state | A `dismissed` flag on a new table — deferred, see Gotchas |
| Reuse `transactions:read` MCP scope | The tool is derived entirely from transaction data a key with that scope can already read | A new `subscriptions:read` scope — unnecessary surface for the same data |

## Gotchas / Pitfalls

- **No way to dismiss a false positive.** A recurring transfer to a family member, rent paid
  manually every month, or any other non-subscription recurring outflow will show up here too —
  there's no per-subscription "ignore" yet. If this becomes annoying in practice, that's the next
  increment (needs a small persisted table, unlike everything else in this feature).
- **Minimum 3 occurrences.** A brand-new subscription (1–2 charges) won't be detected yet — by
  design, to avoid false positives on genuinely one-off or coincidental charges.
- **Merchant grouping is exact-match on the normalized string**, not fuzzy. If a bank renames a
  merchant mid-stream (e.g. `NETFLIX.COM` → `NETFLIX INTERNATIONAL`), it will show up as two
  separate, shorter-lived groups instead of one continuous subscription.
- **`OVERDUE` takes precedence over `PRICE_INCREASED`** when both conditions would technically
  apply — see `SubscriptionsResponse.Status` javadoc.
- **No push/email alerting.** This surfaces in the `/subscriptions` page and the MCP tool only;
  wiring it into a notification channel is a separate, not-yet-built feature (see `claude_features.md`
  idea #6).

## Tests

- `RecurringSubscriptionServiceTest` — 8 unit tests: stable monthly charge (`ACTIVE`), price rise
  above threshold (`PRICE_INCREASED`), missed expected charge (`OVERDUE`), fewer than 3 occurrences
  (not detected), irregular intervals (not detected), weekly cadence + monthly-equivalent
  conversion, cross-currency exclusion from the total, and merchant-normalization folding.
- `McpToolCatalogTest` — updated to pin `get_subscriptions` in the curated MCP tool allowlist.

## Links

- Related ADRs: [Realized P&L: average-cost, computed on the fly](../decisions/2026-07-11-realized-pnl-average-cost-on-the-fly.md), [Compute loan amortization schedules on the fly](../decisions/2026-04-26-loan-amortization-on-the-fly.md) — the precedent this feature follows.
