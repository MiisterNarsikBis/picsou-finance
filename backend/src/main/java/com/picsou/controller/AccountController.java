package com.picsou.controller;

import com.picsou.dto.AccountRequest;
import com.picsou.dto.AccountResponse;
import com.picsou.dto.DebtRequest;
import com.picsou.dto.DebtResponse;
import com.picsou.dto.HoldingResponse;
import com.picsou.dto.RealEstateMetadataRequest;
import com.picsou.dto.RealEstateMetadataResponse;
import com.picsou.dto.SnapshotRequest;
import com.picsou.dto.TransactionResponse;
import com.picsou.model.BalanceSnapshot;
import com.picsou.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public List<AccountResponse> findAll() {
        return accountService.findAll();
    }

    @GetMapping("/{id}")
    public AccountResponse findById(@PathVariable Long id) {
        return accountService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AccountResponse create(@Valid @RequestBody AccountRequest req) {
        return accountService.create(req);
    }

    @PutMapping("/{id}")
    public AccountResponse update(@PathVariable Long id, @Valid @RequestBody AccountRequest req) {
        return accountService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        accountService.delete(id);
    }

    @GetMapping("/{id}/history")
    public List<BalanceSnapshot> getHistory(
        @PathVariable Long id,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return accountService.getHistory(id, from, to);
    }

    @PostMapping("/{id}/snapshot")
    @ResponseStatus(HttpStatus.CREATED)
    public BalanceSnapshot addSnapshot(
        @PathVariable Long id,
        @Valid @RequestBody SnapshotRequest req
    ) {
        return accountService.addManualSnapshot(id, req);
    }

    @GetMapping("/{id}/holdings")
    public List<HoldingResponse> getHoldings(@PathVariable Long id) {
        return accountService.getHoldings(id);
    }

    @GetMapping("/{id}/transactions")
    public List<TransactionResponse> getTransactions(@PathVariable Long id) {
        return accountService.getTransactions(id);
    }

    @PutMapping("/{id}/real-estate")
    public RealEstateMetadataResponse updateRealEstateMetadata(
        @PathVariable Long id,
        @Valid @RequestBody RealEstateMetadataRequest req
    ) {
        return accountService.updateRealEstateMetadata(id, req);
    }

    @PutMapping("/{id}/debt")
    public DebtResponse updateDebtMetadata(
        @PathVariable Long id,
        @Valid @RequestBody DebtRequest req
    ) {
        return accountService.updateDebtMetadata(id, req);
    }
}
