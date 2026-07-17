package com.picsou.service;

import com.picsou.dto.SubscriptionsResponse;
import com.picsou.dto.SubscriptionsResponse.Cadence;
import com.picsou.dto.SubscriptionsResponse.Status;
import com.picsou.dto.SubscriptionsResponse.Subscription;
import com.picsou.model.Account;
import com.picsou.model.AccountType;
import com.picsou.model.Transaction;
import com.picsou.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Detects recurring subscriptions on the fly from a member's outgoing cash transactions — never
 * persisted, mirroring {@code RealizedPnlService} / {@code LoanAmortizationService} (the
 * transaction stream is the source of truth, recomputed on every read).
 *
 * <p>Transactions are grouped by a normalized merchant key (description with digits and
 * punctuation stripped, so reference numbers and dates don't fragment the group), then a group is
 * called "recurring" when it has at least {@link #MIN_OCCURRENCES} charges spaced at a regular
 * weekly/monthly/yearly cadence (interval to the median tolerated within
 * {@link #INTERVAL_TOLERANCE_RATIO}, at most one outlier). A price rise of more than
 * {@link #PRICE_INCREASE_THRESHOLD} between the two most recent charges is flagged
 * {@code PRICE_INCREASED}; a next-expected-charge date missed by more than half a cadence is
 * flagged {@code OVERDUE}.
 */
@Service
@RequiredArgsConstructor
public class RecurringSubscriptionService {

    private static final List<AccountType> CASH_TYPES =
        List.of(AccountType.CHECKING, AccountType.SAVINGS, AccountType.LEP, AccountType.OTHER);

    private static final int MIN_OCCURRENCES = 3;
    private static final BigDecimal PRICE_INCREASE_THRESHOLD = new BigDecimal("1.05");
    private static final double INTERVAL_TOLERANCE_RATIO = 0.35;
    private static final long MAX_OUTLIER_INTERVALS = 1;
    private static final double OVERDUE_MULTIPLIER = 1.5;

    private final TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public SubscriptionsResponse detect(Long memberId) {
        List<Transaction> outgoing =
            transactionRepository.findOutgoingCashTransactionsByMemberId(memberId, CASH_TYPES);

        Map<String, List<Transaction>> byMerchant = outgoing.stream()
            .collect(Collectors.groupingBy(
                t -> normalizeMerchant(t.getDescription()), LinkedHashMap::new, Collectors.toList()));

        List<Subscription> subscriptions = new ArrayList<>();
        for (Map.Entry<String, List<Transaction>> entry : byMerchant.entrySet()) {
            if (entry.getKey().isBlank()) {
                continue;
            }
            List<Transaction> txs = new ArrayList<>(entry.getValue());
            txs.sort(Comparator.comparing(Transaction::getDate));
            detectRecurring(entry.getKey(), txs).ifPresent(subscriptions::add);
        }

        subscriptions.sort(Comparator.comparing(this::monthlyEquivalent).reversed());

        String currency = dominantCurrency(outgoing);
        BigDecimal totalMonthlyCost = subscriptions.stream()
            .filter(s -> currency.equals(s.nativeCurrency()))
            .map(this::monthlyEquivalent)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);

        return new SubscriptionsResponse(totalMonthlyCost, currency, subscriptions);
    }

    private Optional<Subscription> detectRecurring(String merchant, List<Transaction> txs) {
        if (txs.size() < MIN_OCCURRENCES) {
            return Optional.empty();
        }

        List<Long> intervals = new ArrayList<>();
        for (int i = 1; i < txs.size(); i++) {
            intervals.add(ChronoUnit.DAYS.between(txs.get(i - 1).getDate(), txs.get(i).getDate()));
        }
        long medianInterval = median(intervals);
        Cadence cadence = classifyCadence(medianInterval);
        if (cadence == null) {
            return Optional.empty();
        }

        long tolerance = Math.round(medianInterval * INTERVAL_TOLERANCE_RATIO);
        long outliers = intervals.stream().filter(i -> Math.abs(i - medianInterval) > tolerance).count();
        if (outliers > MAX_OUTLIER_INTERVALS) {
            return Optional.empty();
        }

        Transaction last = txs.get(txs.size() - 1);
        Transaction previous = txs.get(txs.size() - 2);
        BigDecimal lastAmount = last.getAmount().abs();
        BigDecimal previousAmount = previous.getAmount().abs();
        BigDecimal averageAmount = txs.stream()
            .map(t -> t.getAmount().abs())
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(BigDecimal.valueOf(txs.size()), 2, RoundingMode.HALF_UP);

        LocalDate nextExpected = last.getDate().plusDays(medianInterval);
        Status status;
        long overdueDays = ChronoUnit.DAYS.between(nextExpected, LocalDate.now());
        if (overdueDays > medianInterval * (OVERDUE_MULTIPLIER - 1)) {
            status = Status.OVERDUE;
        } else if (lastAmount.compareTo(previousAmount.multiply(PRICE_INCREASE_THRESHOLD)) > 0) {
            status = Status.PRICE_INCREASED;
        } else {
            status = Status.ACTIVE;
        }

        Account account = last.getAccount();
        return Optional.of(new Subscription(
            merchant, last.getCategory(), last.getNativeCurrency(), cadence,
            lastAmount, previousAmount, averageAmount, last.getDate(), nextExpected, status,
            txs.size(), account.getId(), account.getName()));
    }

    private static Cadence classifyCadence(long medianDays) {
        if (medianDays >= 5 && medianDays <= 9) return Cadence.WEEKLY;
        if (medianDays >= 25 && medianDays <= 35) return Cadence.MONTHLY;
        if (medianDays >= 350 && medianDays <= 380) return Cadence.YEARLY;
        return null;
    }

    private static long median(List<Long> values) {
        List<Long> sorted = new ArrayList<>(values);
        Collections.sort(sorted);
        int mid = sorted.size() / 2;
        return sorted.size() % 2 == 0
            ? Math.round((sorted.get(mid - 1) + sorted.get(mid)) / 2.0)
            : sorted.get(mid);
    }

    private BigDecimal monthlyEquivalent(Subscription s) {
        return switch (s.cadence()) {
            case WEEKLY -> s.averageAmount().multiply(BigDecimal.valueOf(52))
                .divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            case MONTHLY -> s.averageAmount();
            case YEARLY -> s.averageAmount().divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
        };
    }

    private static String dominantCurrency(List<Transaction> txs) {
        return txs.stream()
            .collect(Collectors.groupingBy(Transaction::getNativeCurrency, Collectors.counting()))
            .entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("EUR");
    }

    /** Strips digits and punctuation so reference numbers/dates embedded in a bank description
     * (e.g. "PRLV SEPA NETFLIX.COM 4498217 15/01") don't fragment the same merchant into several
     * groups across months. */
    static String normalizeMerchant(String description) {
        if (description == null) {
            return "";
        }
        String s = description.toUpperCase(Locale.ROOT);
        s = s.replaceAll("\\d+", " ");
        s = s.replaceAll("[^A-Z ]", " ");
        s = s.replaceAll("\\s+", " ").trim();
        return s;
    }
}
