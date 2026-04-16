# Feature: Live Prices in Holdings

> Last updated: 2026-04-13

## Context

Holdings (PEA, Compte-Titres, Crypto) display prices that are only updated during a full sync. When a user navigates to an account detail page, the displayed prices may be stale — sometimes hours old. The backend already exposes `GET /api/prices?tickers=...` via `PriceController` which refreshes the cache and returns live EUR prices. This feature integrates those live prices into the holdings table on page navigation, and propagates live portfolio values (with PnL) to Goals progress, Dashboard distribution, and the AccountDetail balance card.

## How it works

The frontend fetches holdings and live prices in parallel, then merges them client-side. The backend also computes live values server-side for Goals and Dashboard.

### Frontend data flow (holdings table)

```
User navigates to account detail
        |
        v
useHoldingsWithLivePrices(id)
        |
        +-- GET /api/accounts/{id}/holdings  (DB prices, may be stale)
        |
        +-- GET /api/prices?tickers=BTC,ETH,IWDA.AS  (live prices from providers)
        |
        v
Merge: override currentPrice with live price
Recalculate: currentValueEur, pnlEur, pnlPercent
        |
        v
HoldingsTable renders with live prices
```

If the prices API fails (network error, provider down), the hook falls back to the DB prices gracefully.

### Frontend data flow (AccountDetail balance)

For holding accounts (PEA, COMPTE_TITRES, CRYPTO), the balance card shows the live total from holdings with live prices, not the stored `account.currentBalanceEur`:

```
liveTotal = SUM(holding.currentValueEur)  // from merged holdings with live prices
displayBalance = showHoldings && holdings.length > 0 && liveTotal > 0
    ? liveTotal
    : account.currentBalanceEur           // fallback for non-holding accounts
```

### Backend data flow (Goals & Dashboard)

The backend computes live balance via `AccountService.liveBalanceEur()`:

```
AccountService.liveBalanceEur(account)
        |
        +-- Load holdings for account
        |
        +-- If no holdings: return stored balance converted to EUR
        |
        +-- If holdings: for each holding:
        |       +-- priceService.getPriceEur(ticker)  (live cache, 15-min TTL)
        |       +-- fallback to holding.currentPrice if live price unavailable
        |       +-- accumulate qty * livePrice
        |
        v
Return live portfolio value in EUR
```

Used by:
- `GoalService.toProgressResponse()` — sums `liveBalanceEur()` across linked accounts for `currentTotal`
- `DashboardService.buildDistribution()` — uses live values from pre-loaded `holdingsByAccount` map for distribution percentages
- `DashboardService.getDashboard()` — already computed live total/invested inline (pre-dates `liveBalanceEur()`)

### Key files

- `frontend/src/features/accounts/api.ts` — `prices(tickers)` API function
- `frontend/src/features/accounts/hooks.ts` — `useHoldingsWithLivePrices(id)` hook
- `frontend/src/pages/accounts/AccountDetailPage.tsx` — uses the hook; `displayBalance` for holding accounts
- `backend/src/main/java/com/picsou/service/AccountService.java` — `liveBalanceEur()` method
- `backend/src/main/java/com/picsou/service/GoalService.java` — uses `liveBalanceEur()` in `toProgressResponse()`
- `backend/src/main/java/com/picsou/service/DashboardService.java` — `buildDistribution()` uses live values from `holdingsByAccount`

## Technical choices

| Choice | Why | Rejected alternative |
|--------|-----|----------------------|
| Two separate API calls (holdings + prices) | Clean separation of concerns; prices API is reusable; backend unchanged | Backend-side price refresh in `getHoldings()` (slower page load, couples concerns) |
| Client-side merge | No backend change needed; works with existing `HoldingResponse` shape | New dedicated endpoint returning enriched holdings (more backend work) |
| Graceful degradation on price failure | Better UX than showing errors for non-critical price data | Throwing error / blocking page render |

## Gotchas / Pitfalls

- **Prices are not persisted**: Live prices are only used for display. The DB `current_price` in `account_holding` is not updated — that still happens during sync.
- **`useAccountHoldings` still exists**: The old hook is kept for the `usePortfolio` hook which fetches holdings for all accounts (portfolio view). Switching it to live prices would trigger many price API calls at once.
- **No polling**: Prices refresh only on navigation (TanStack Query stale time of 2 min). There is no auto-refresh or polling interval.
- **Yahoo Finance is unofficial**: See [price-service.md](./price-service.md) gotchas. If Yahoo is down, stock/ETF prices fall back to stale DB values.
- **`AccountService.toResponse()` uses stored balance**: This is intentional — it returns `currentBalanceEur` (stale but fast). Use `liveBalanceEur()` when you need the current portfolio value with PnL.
- **`liveBalanceEur()` triggers price lookups**: Each call fetches holdings then queries `PriceService` per ticker. Don't call in tight loops. The Dashboard pre-loads holdings into a map to avoid N+1; Goals calls it per-account in the goal's account list (typically small).
- **`AccountDetailPage.displayBalance` only applies to holding accounts with live data**: If holdings are empty or `liveTotal == 0`, it falls back to `account.currentBalanceEur`. Non-holding accounts always show the stored balance.

## Tests

- Manual: navigate to a PEA/CT/Crypto account, verify `/api/prices` call in network tab and live prices in table
- Manual: navigate to a checking/savings account, verify no `/api/prices` call

## Links

- Related feature: [Price Service](./price-service.md)
- Related ADR: [Ports and adapters](../decisions/2026-01-01-ports-and-adapters.md)
