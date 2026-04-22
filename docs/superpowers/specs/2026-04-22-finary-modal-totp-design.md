# Finary Modal — Proactive TOTP Check

**Date:** 2026-04-22  
**Scope:** `AddAccountModal.tsx` → `FinaryWizard` component + backend

## Problem

In the "Add Account" modal, the Finary first-connection flow has two UX issues:

1. **Blind spinner**: after submitting email/password, `handleLogin` immediately calls
   `handleApiSyncPreview()` which sets `onPending(true)` — triggering the full-screen
   spinner overlay. The preview call fails with 403 if TOTP is required, at which point
   the spinner hides and the TOTP field appears. The user never understood why the overlay
   appeared or disappeared.

2. **No connected state**: when `isConnected` is already `true`, the modal shows only a
   "Sync" button with no information about which account is connected.

## Solution

Add a `POST /api/finary/check-totp` endpoint that checks whether TOTP is required
**before** attempting the full preview. After login, call this endpoint with local loading
only (no overlay). Depending on the result, either show the TOTP field immediately or
proceed to preview.

## Architecture

```
[Login form] → POST /api/finary/login (store creds)
                    ↓
              POST /api/finary/check-totp → { totpRequired: boolean }
                    ↓
     ┌──────────────┴──────────────┐
  false                          true
     ↓                             ↓
  POST /api-sync/preview      [TOTP field shown]
  (onPending spinner)               ↓
                             POST /api-sync/preview?totp=...
                             (onPending spinner)
```

The `signInId` returned by `checkTotpRequired` is discarded — `authenticate()` (called
by `preview`) always starts a fresh Clerk sign-in. Two Clerk attempts are made when TOTP
is involved; this is acceptable given the UX benefit.

## Backend changes

### New DTO
`com.picsou.dto.FinaryCheckTotpResponse`:
```java
public record FinaryCheckTotpResponse(boolean totpRequired) {}
```

### New service method
`FinaryApiSyncService.checkTotp(Long memberId)`:
- Fetches and decrypts stored session credentials for `memberId`
- Throws `ResourceNotFoundException` if no session exists (caller must `/login` first)
- Calls `finaryApiClient.checkTotpRequired(email, password)`
- Returns `new FinaryCheckTotpResponse(signInId != null)`

### New controller endpoint
`FinaryApiSyncController`:
```java
@PostMapping("/check-totp")
public FinaryCheckTotpResponse checkTotp() {
    return finaryApiSyncService.checkTotp(userContext.currentMemberId());
}
```

## Frontend changes

### `features/sync/api.ts`
Add:
```ts
checkTotp: () =>
  apiClient.post<{ totpRequired: boolean }>('/api/finary/check-totp').then(r => r.data)
```

### `features/sync/hooks.ts`
Add `useCheckFinaryTotp()` as a mutation (not a query — it's an active call):
```ts
export function useCheckFinaryTotp() {
  return useMutation({ mutationFn: finaryApi.checkTotp })
}
```

### `AddAccountModal.tsx` — `FinaryWizard`

**Hook**: add `useCheckFinaryTotp`.

**`handleLogin` rewrite**:
```
onSuccess of loginMutation:
  setLoading(true)               // local spinner only, no onPending
  call checkTotpMutation.mutate()
    onSuccess: { totpRequired }
      setLoading(false)
      if totpRequired  → setTotpRequired(true)   // show TOTP field
      else             → handleApiSyncPreview()   // proceed normally (uses onPending)
    onError:
      setLoading(false)
      setError(message)
```

**Connected state display**: when `isConnected` is true and `connectionStatus.maskedEmail`
is available, show the masked email above the Sync button:
```tsx
{isConnected && connectionStatus?.maskedEmail && (
  <p className="text-xs text-muted-foreground text-center">
    {connectionStatus.maskedEmail}
  </p>
)}
```

**No changes** to `handleSync`, `handleApiSyncPreview`, `executeWithMappings`,
or the file upload flow.

## Error handling

| Scenario | Behaviour |
|---|---|
| `check-totp` fails (bad creds, network) | `setError(message)`, stay on step 1, user can retry |
| `preview` fails with 403 after check said `false` | existing path: `setTotpRequired(true)` (race/edge case) |
| No session when `check-totp` called | 404 from backend → error banner |

## Out of scope

- `FinaryTab.tsx` on `/sync` page (separate component, not reported broken)
- Persisting Clerk `signInId` to avoid the double sign-in attempt
- Any changes to the mapping or execute steps
