# Finary Modal — Proactive TOTP Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "Add Account" modal Finary wizard so TOTP is detected proactively — no blind spinner overlay, and connected state is shown clearly.

**Architecture:** Add `POST /api/finary/check-totp` backend endpoint that uses the existing `FinaryApiClient.checkTotpRequired()` method. After login succeeds in the modal, call `check-totp` with local loading only (no overlay); if TOTP is required, show the field immediately; if not, proceed directly to preview.

**Tech Stack:** Java 21 / Spring Boot (backend), React 19 / TypeScript / TanStack Query (frontend)

**Spec:** `docs/superpowers/specs/2026-04-22-finary-modal-totp-design.md`

---

## File map

| File | Change |
|---|---|
| `backend/src/main/java/com/picsou/dto/FinaryCheckTotpResponse.java` | **Create** — new DTO record |
| `backend/src/main/java/com/picsou/finary/FinaryApiSyncService.java` | **Modify** — add `checkTotp(Long memberId)` |
| `backend/src/main/java/com/picsou/controller/FinaryApiSyncController.java` | **Modify** — add `POST /check-totp` endpoint |
| `backend/src/test/java/com/picsou/service/FinaryApiSyncServiceTest.java` | **Create** — unit tests for `checkTotp` |
| `frontend/src/features/sync/api.ts` | **Modify** — add `checkTotp` function to `finaryApi` |
| `frontend/src/features/sync/hooks.ts` | **Modify** — add `useCheckFinaryTotp` mutation hook |
| `frontend/src/components/shared/AddAccountModal.tsx` | **Modify** — rewrite `handleLogin` in `FinaryWizard`, add connected state display |

---

## Task 1: Backend DTO

**Files:**
- Create: `backend/src/main/java/com/picsou/dto/FinaryCheckTotpResponse.java`

- [ ] **Step 1: Create the DTO**

```java
package com.picsou.dto;

public record FinaryCheckTotpResponse(boolean totpRequired) {}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && mvn compile -q
```
Expected: BUILD SUCCESS, no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/picsou/dto/FinaryCheckTotpResponse.java
git commit -m "feat(finary): add FinaryCheckTotpResponse DTO"
```

---

## Task 2: Backend service method + test

**Files:**
- Modify: `backend/src/main/java/com/picsou/finary/FinaryApiSyncService.java`
- Create: `backend/src/test/java/com/picsou/service/FinaryApiSyncServiceTest.java`

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/com/picsou/service/FinaryApiSyncServiceTest.java`:

```java
package com.picsou.service;

import com.picsou.config.CryptoEncryption;
import com.picsou.dto.FinaryCheckTotpResponse;
import com.picsou.exception.ResourceNotFoundException;
import com.picsou.finary.FinaryApiSyncService;
import com.picsou.finary.FinaryPersistenceHelper;
import com.picsou.finary.client.FinaryApiClient;
import com.picsou.model.FamilyMember;
import com.picsou.model.FinarySession;
import com.picsou.repository.AccountRepository;
import com.picsou.repository.FamilyMemberRepository;
import com.picsou.repository.FinarySessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinaryApiSyncServiceTest {

    @Mock FinaryApiClient finaryApiClient;
    @Mock CryptoEncryption encryption;
    @Mock AccountRepository accountRepository;
    @Mock FamilyMemberRepository familyMemberRepository;
    @Mock FinarySessionRepository finarySessionRepository;
    @Mock FinaryPersistenceHelper persistenceHelper;

    @InjectMocks FinaryApiSyncService service;

    @Test
    void checkTotp_returnsTrue_whenTotpRequired() {
        FinarySession session = FinarySession.builder()
            .member(FamilyMember.builder().id(1L).build())
            .email("enc-email")
            .password("enc-pass")
            .status("CONNECTED")
            .build();
        when(finarySessionRepository.findByMemberId(1L)).thenReturn(Optional.of(session));
        when(encryption.decrypt("enc-email")).thenReturn("user@example.com");
        when(encryption.decrypt("enc-pass")).thenReturn("secret");
        when(finaryApiClient.checkTotpRequired("user@example.com", "secret")).thenReturn("sign-in-id-123");

        FinaryCheckTotpResponse result = service.checkTotp(1L);

        assertThat(result.totpRequired()).isTrue();
    }

    @Test
    void checkTotp_returnsFalse_whenNoTotpNeeded() {
        FinarySession session = FinarySession.builder()
            .member(FamilyMember.builder().id(1L).build())
            .email("enc-email")
            .password("enc-pass")
            .status("CONNECTED")
            .build();
        when(finarySessionRepository.findByMemberId(1L)).thenReturn(Optional.of(session));
        when(encryption.decrypt("enc-email")).thenReturn("user@example.com");
        when(encryption.decrypt("enc-pass")).thenReturn("secret");
        when(finaryApiClient.checkTotpRequired("user@example.com", "secret")).thenReturn(null);

        FinaryCheckTotpResponse result = service.checkTotp(1L);

        assertThat(result.totpRequired()).isFalse();
    }

    @Test
    void checkTotp_throwsResourceNotFoundException_whenNoSession() {
        when(finarySessionRepository.findByMemberId(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.checkTotp(99L))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && mvn test -Dtest=FinaryApiSyncServiceTest -q
```
Expected: FAIL — `checkTotp` method does not exist yet.

- [ ] **Step 3: Add `checkTotp` to `FinaryApiSyncService`**

In `backend/src/main/java/com/picsou/finary/FinaryApiSyncService.java`, add this method after `getConnectionStatus`:

```java
public FinaryCheckTotpResponse checkTotp(Long memberId) {
    FinarySession session = finarySessionRepository.findByMemberId(memberId)
        .orElseThrow(() -> new ResourceNotFoundException("No Finary session for member: " + memberId));
    String email = encryption.decrypt(session.getEmail());
    String password = encryption.decrypt(session.getPassword());
    String signInId = finaryApiClient.checkTotpRequired(email, password);
    return new FinaryCheckTotpResponse(signInId != null);
}
```

Also add the import at the top of the file:
```java
import com.picsou.dto.FinaryCheckTotpResponse;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && mvn test -Dtest=FinaryApiSyncServiceTest -q
```
Expected: BUILD SUCCESS, 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/picsou/finary/FinaryApiSyncService.java \
        backend/src/test/java/com/picsou/service/FinaryApiSyncServiceTest.java
git commit -m "feat(finary): add checkTotp service method"
```

---

## Task 3: Backend controller endpoint

**Files:**
- Modify: `backend/src/main/java/com/picsou/controller/FinaryApiSyncController.java`

- [ ] **Step 1: Add the endpoint**

In `FinaryApiSyncController.java`, add after the `login` endpoint (line ~40):

```java
/**
 * Check whether stored Finary credentials require TOTP to authenticate.
 * Must be called after /login has stored credentials.
 */
@PostMapping("/check-totp")
public FinaryCheckTotpResponse checkTotp() {
    return finaryApiSyncService.checkTotp(userContext.currentMemberId());
}
```

Add the import:
```java
import com.picsou.dto.FinaryCheckTotpResponse;
```

- [ ] **Step 2: Compile and run all backend tests**

```bash
cd backend && mvn test -q
```
Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/com/picsou/controller/FinaryApiSyncController.java
git commit -m "feat(finary): expose POST /api/finary/check-totp endpoint"
```

---

## Task 4: Frontend API + hook

**Files:**
- Modify: `frontend/src/features/sync/api.ts`
- Modify: `frontend/src/features/sync/hooks.ts`

- [ ] **Step 1: Add `checkTotp` to `finaryApi` in `api.ts`**

In `frontend/src/features/sync/api.ts`, inside the `finaryApi` object (after `login`), add:

```ts
checkTotp: () =>
  api.post<{ totpRequired: boolean }>('/finary/check-totp').then(r => r.data),
```

- [ ] **Step 2: Add `useCheckFinaryTotp` hook in `hooks.ts`**

In `frontend/src/features/sync/hooks.ts`, after `useFinaryLogin` (around line 337), add:

```ts
export function useCheckFinaryTotp() {
  return useMutation({
    mutationFn: finaryApi.checkTotp,
  })
}
```

- [ ] **Step 3: Type-check**

```bash
cd frontend && bun run typecheck
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/sync/api.ts frontend/src/features/sync/hooks.ts
git commit -m "feat(finary): add checkTotp API function and hook"
```

---

## Task 5: AddAccountModal — FinaryWizard UX fix

**Files:**
- Modify: `frontend/src/components/shared/AddAccountModal.tsx`

- [ ] **Step 1: Import `useCheckFinaryTotp` in the modal**

At the top of `AddAccountModal.tsx`, add `useCheckFinaryTotp` to the existing import from `@/features/sync/hooks`:

```ts
import {
  useSearchInstitutions,
  useInitiateBankSync,
  useInitiateTrAuth,
  useCompleteTrAuth,
  useAddCryptoExchange,
  useAddCryptoWallet,
  useFinaryConnectionStatus,
  useFinaryLogin,
  usePreviewFinaryFile,
  usePreviewFinaryApi,
  useImportFinary,
  useExecuteFinaryApiSync,
  useCheckFinaryTotp,           // ← add this
} from '@/features/sync/hooks'
```

- [ ] **Step 2: Add the hook and rewrite `handleLogin` in `FinaryWizard`**

Inside the `FinaryWizard` function, after the existing hook declarations (around line 693), add:

```ts
const checkTotpMutation = useCheckFinaryTotp()
```

Replace the entire `handleLogin` function (lines 697–718) with:

```ts
function handleLogin(e: React.FormEvent) {
  e.preventDefault()
  if (!email || !password) return
  setLoading(true)
  setError(null)
  loginMutation.mutate(
    { email, password },
    {
      onSuccess: () => {
        setEmail('')
        setPassword('')
        checkTotpMutation.mutate(undefined, {
          onSuccess: ({ totpRequired }) => {
            setLoading(false)
            if (totpRequired) {
              setTotpRequired(true)
            } else {
              handleApiSyncPreview()
            }
          },
          onError: (err: any) => {
            setLoading(false)
            setError(err.response?.data?.detail || t('common.retry'))
          },
        })
      },
      onError: () => {
        setLoading(false)
        onPending(false)
      },
    },
  )
}
```

Note: `onPending(false)` is **not** called inside the `checkTotpMutation` callbacks — `onPending(true)` was never called (local loading only). `handleApiSyncPreview()` calls `onPending(true)` internally when it proceeds.

- [ ] **Step 3: Add connected state display**

In the `FinaryWizard` JSX, inside the `isConnected` branch (the `<div className="space-y-3">` at line ~967), add the masked email above the Sync button:

```tsx
{isConnected && (
  <div className="space-y-3">
    {connectionStatus?.maskedEmail && (
      <p className="text-xs text-muted-foreground text-center">
        {connectionStatus.maskedEmail}
      </p>
    )}
    <Button onClick={handleSync} disabled={loading} className="w-full" size="sm">
      {loading ? (
        <><Loader2 className="size-3.5 animate-spin" />{t('sync.finary.syncing')}</>
      ) : (
        <><RefreshCw className="size-3.5" />{t('sync.finary.sync')}</>
      )}
    </Button>
    {totpRequired && (
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="finary-totp" className="text-xs">{t('sync.finary.totp')}</Label>
          <Input id="finary-totp" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} placeholder="000000" maxLength={6} className="mt-1 h-9" />
        </div>
        <Button className="mt-4" onClick={handleSync} disabled={totpCode.length !== 6 || loading} size="sm">
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Type-check**

```bash
cd frontend && bun run typecheck
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/shared/AddAccountModal.tsx
git commit -m "fix(finary): proactive TOTP check in Add Account modal, show connected email"
```

---

## Task 6: Manual smoke test

- [ ] **Step 1: Start the app**

```bash
cd frontend && bun run dev
```

Open `http://localhost:5173`, log in, go to `/accounts`.

- [ ] **Step 2: Test first-connection flow with TOTP**

1. Click "Add Account" → choose "Finary"
2. Enter a Finary email + password for an account with 2FA enabled
3. Click "Se connecter"
4. **Expected:** spinner shows briefly (local, no overlay), then TOTP field appears immediately — no full-screen overlay, no jarring transition
5. Enter the 6-digit TOTP code, click →
6. **Expected:** overlay spinner appears (preview in progress), then mapping step

- [ ] **Step 3: Test first-connection flow without TOTP**

1. Click "Add Account" → choose "Finary"
2. Enter credentials for an account without 2FA
3. Click "Se connecter"
4. **Expected:** spinner briefly, then overlay spinner directly (no TOTP field), then mapping step

- [ ] **Step 4: Test already-connected state**

1. With a Finary session already stored, click "Add Account" → "Finary"
2. **Expected:** masked email is visible above the Sync button (e.g. `u***@example.com`)
