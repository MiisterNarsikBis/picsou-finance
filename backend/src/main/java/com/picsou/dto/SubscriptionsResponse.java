package com.picsou.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;

/**
 * Recurring subscriptions detected on the fly from the member's outgoing cash transactions
 * (see {@code RecurringSubscriptionService}) — never persisted, mirroring
 * {@code RealizedPnlResponse} / {@code LoanAmortizationResponse}.
 *
 * @param totalMonthlyCost sum of each subscription's monthly-equivalent cost, restricted to
 *                          {@code currency} (subscriptions in a different currency are still
 *                          listed individually but excluded from this total to avoid a
 *                          meaningless cross-currency sum)
 * @param currency          the dominant currency across the member's outgoing cash transactions
 * @param subscriptions     detected subscriptions, highest monthly-equivalent cost first
 */
public record SubscriptionsResponse(
    BigDecimal totalMonthlyCost,
    String currency,
    List<Subscription> subscriptions
) {
    public SubscriptionsResponse {
        Objects.requireNonNull(totalMonthlyCost, "totalMonthlyCost is required");
        Objects.requireNonNull(currency, "currency is required");
        Objects.requireNonNull(subscriptions, "subscriptions is required");
        if (totalMonthlyCost.signum() < 0) {
            throw new IllegalArgumentException("totalMonthlyCost must be non-negative");
        }
    }

    /**
     * {@code lastAmount}/{@code previousAmount}/{@code averageAmount} are absolute magnitudes
     * (always &ge; 0), unlike {@code Transaction.amount} which is signed negative for an outflow —
     * every transaction behind a detected subscription is an outflow by construction (see
     * {@code TransactionRepository.findOutgoingCashTransactionsByMemberId}), so the sign carries no
     * information here and is dropped for a simpler API. {@code occurrences} is the number of
     * transactions the group was detected from (at least {@code RecurringSubscriptionService.MIN_OCCURRENCES}).
     */
    public record Subscription(
        String merchant,
        String category,
        String nativeCurrency,
        Cadence cadence,
        BigDecimal lastAmount,
        BigDecimal previousAmount,
        BigDecimal averageAmount,
        LocalDate lastDate,
        LocalDate nextExpectedDate,
        Status status,
        int occurrences,
        Long accountId,
        String accountName
    ) {}

    public enum Cadence { WEEKLY, MONTHLY, YEARLY }

    /**
     * {@code OVERDUE} takes precedence over {@code PRICE_INCREASED} when both would apply — a
     * charge that stopped coming is more actionable than a stale price comparison.
     */
    public enum Status { ACTIVE, PRICE_INCREASED, OVERDUE }
}
