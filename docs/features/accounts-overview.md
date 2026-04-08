# Feature: Accounts Overview (stacked chart + asset type filters)

> Last updated: 2026-04-09

## Context

The Accounts page (`/accounts`) only showed a flat grid of account cards. Users needed a visual overview of balance evolution over time, with the ability to filter by asset type (stocks, savings, crypto, etc.) to see both the chart and the card grid change together.

## How it works

### Stacked chart with dual aggregation mode

The `AccountsStackedChart` component renders a Recharts stacked area chart. It receives an `accounts` array and a `data` array of `{ date, [id]: balance }` points. Each account becomes one stacked area using its `color`.

The page prepares chart data differently based on the active filter:

- **ALL filter**: data is aggregated by asset type group (one area per group). Virtual `Account` objects are created with the group's translated label and a fixed color.
- **Specific filter** (e.g. STOCKS): data is filtered to only include accounts of that type, shown as individual areas.

### Asset type filters

Six asset categories defined in `AccountsPage.tsx`:

| Filter key | Account types | Chart color |
|-----------|--------------|-------------|
| STOCKS | PEA, COMPTE_TITRES | `#6366f1` |
| METALS | OTHER | `#eab308` |
| SAVINGS | LEP, SAVINGS | `#22c55e` |
| CHECKING | CHECKING | `#0ea5e9` |
| CRYPTO | CRYPTO | `#f97316` |
| REAL_ESTATE | *(none yet)* | `#a855f7` |

The filter affects both the chart and the account card grid simultaneously.

### History fetching

`useAllAccountsHistory` fetches `/accounts/{id}/history` for every account in parallel, merges all snapshots into a unified time series, and forward-fills missing values (last known balance carried forward). It also injects each account's current balance at today's date if no snapshot exists for today.

### Key files

- `frontend/src/pages/accounts/AccountsPage.tsx` — page with filters, chart, and grid
- `frontend/src/components/shared/AccountsStackedChart.tsx` — stacked area chart component
- `frontend/src/features/accounts/hooks.ts` — `useAllAccountsHistory` hook
- `frontend/src/demo/index.ts` — mock history data (12 months per account)

### Flow

```
AccountsPage
  ├─ useAccounts()                    → list of all accounts
  ├─ useAllAccountsHistory()          → merged time series [{ date, accountId: balance }]
  │
  ├─ Filter pills (ALL / STOCKS / ...)
  │
  ├─ chartAccounts (useMemo)
  │   ├─ ALL  → virtual accounts per TYPE_GROUP_META
  │   └─ else → real accounts filtered by type
  │
  ├─ chartHistory (useMemo)
  │   ├─ ALL  → sum balances per type group per date
  │   └─ else → keep only matching account IDs per date
  │
  ├─ <AccountsStackedChart accounts={chartAccounts} data={chartHistory} />
  │
  └─ filteredAccounts (useMemo) → account card grid
```

## Technical choices

| Choice | Why | Rejected alternative |
|--------|-----|----------------------|
| Virtual `Account` objects for type groups in ALL mode | `AccountsStackedChart` expects `Account[]` — avoids a second component or prop variant | Separate `GroupedStackedChart` component |
| Client-side aggregation in `useMemo` | No backend endpoint for grouped history; keeps the existing per-account API | New backend endpoint `/accounts/history?grouped=true` |
| Forward-fill missing balance values | Accounts may not have snapshots for every date; chart needs continuous data | Interpolation between points (would invent non-real values) |
| `BalanceSnapshot` mock data expanded to 12 months | Original 3 points made the chart nearly unreadable | Generating points dynamically with random walk |

## Gotchas / Pitfalls

- **`TYPE_TO_GROUP` must cover every `AccountType`** — if a new type is added to the enum but not to this map, those accounts silently disappear from the ALL chart.
- **`REAL_ESTATE` maps to no `AccountType`** — it's a placeholder category for future use. The filter pill shows but the grid/chart will be empty.
- **`Account.id` cast to `number`** — virtual group accounts use string keys (`'STOCKS'`, `'CRYPTO'`) cast as `number` via `as unknown as number`. This works because Recharts uses `dataKey` as a string lookup anyway, but it's fragile.
- **Demo mock history uses `generateHistory()`** — a helper in `demo/index.ts` that creates 12 monthly points. The last point should match the account's `currentBalance` in `demo/data/accounts.ts` to stay consistent.
- **`useAllAccountsHistory` is disabled when no accounts exist** (`enabled: !!accounts && accounts.length > 0`). If accounts are deleted, the query stays disabled until the accounts list refetches.

## Tests

No dedicated test files for this feature yet.

## Links

- i18n keys: `accounts.evolution`, `accounts.filters.*` in `en.json` / `fr.json`
