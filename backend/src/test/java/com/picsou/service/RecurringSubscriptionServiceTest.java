package com.picsou.service;

import com.picsou.dto.SubscriptionsResponse;
import com.picsou.dto.SubscriptionsResponse.Cadence;
import com.picsou.dto.SubscriptionsResponse.Status;
import com.picsou.dto.SubscriptionsResponse.Subscription;
import com.picsou.model.Account;
import com.picsou.model.AccountType;
import com.picsou.model.Transaction;
import com.picsou.repository.TransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RecurringSubscriptionServiceTest {

    private static final Long MEMBER_ID = 1L;

    @Mock TransactionRepository transactionRepository;
    @InjectMocks RecurringSubscriptionService service;

    private Account account() {
        return Account.builder().id(10L).name("Compte courant").type(AccountType.CHECKING).currency("EUR").build();
    }

    private Transaction tx(LocalDate date, String description, String amount) {
        return tx(date, description, amount, "EUR");
    }

    private Transaction tx(LocalDate date, String description, String amount, String currency) {
        return Transaction.builder()
            .account(account())
            .date(date)
            .description(description)
            .amount(new BigDecimal(amount))
            .nativeCurrency(currency)
            .build();
    }

    private void stub(List<Transaction> txs) {
        when(transactionRepository.findOutgoingCashTransactionsByMemberId(eq(MEMBER_ID), anyList()))
            .thenReturn(txs);
    }

    @Test
    void monthlyChargesWithStablePrice_areDetectedAsActive() {
        LocalDate now = LocalDate.now();
        stub(List.of(
            tx(now.minusMonths(3), "PRLV SEPA NETFLIX.COM 4498217", "-9.99"),
            tx(now.minusMonths(2), "PRLV SEPA NETFLIX.COM 5512890", "-9.99"),
            tx(now.minusMonths(1), "PRLV SEPA NETFLIX.COM 6321004", "-9.99"),
            tx(now, "PRLV SEPA NETFLIX.COM 7845112", "-9.99")
        ));

        SubscriptionsResponse response = service.detect(MEMBER_ID);

        assertThat(response.subscriptions()).hasSize(1);
        Subscription sub = response.subscriptions().get(0);
        assertThat(sub.cadence()).isEqualTo(Cadence.MONTHLY);
        assertThat(sub.status()).isEqualTo(Status.ACTIVE);
        assertThat(sub.occurrences()).isEqualTo(4);
        assertThat(sub.lastAmount()).isEqualByComparingTo("9.99");
        assertThat(response.totalMonthlyCost()).isEqualByComparingTo("9.99");
    }

    @Test
    void priceIncreaseAboveThreshold_isFlaggedPriceIncreased() {
        LocalDate now = LocalDate.now();
        stub(List.of(
            tx(now.minusMonths(3), "SALLE DE SPORT ABC", "-29.90"),
            tx(now.minusMonths(2), "SALLE DE SPORT ABC", "-29.90"),
            tx(now.minusMonths(1), "SALLE DE SPORT ABC", "-29.90"),
            tx(now, "SALLE DE SPORT ABC", "-34.90")
        ));

        Subscription sub = service.detect(MEMBER_ID).subscriptions().get(0);

        assertThat(sub.status()).isEqualTo(Status.PRICE_INCREASED);
        assertThat(sub.previousAmount()).isEqualByComparingTo("29.90");
        assertThat(sub.lastAmount()).isEqualByComparingTo("34.90");
    }

    @Test
    void missedExpectedCharge_isFlaggedOverdue() {
        LocalDate now = LocalDate.now();
        stub(List.of(
            tx(now.minusMonths(5), "ASSURANCE HABITATION", "-15.00"),
            tx(now.minusMonths(4), "ASSURANCE HABITATION", "-15.00"),
            tx(now.minusMonths(3), "ASSURANCE HABITATION", "-15.00")
        ));

        Subscription sub = service.detect(MEMBER_ID).subscriptions().get(0);

        assertThat(sub.status()).isEqualTo(Status.OVERDUE);
    }

    @Test
    void fewerThanThreeOccurrences_isNotDetected() {
        LocalDate now = LocalDate.now();
        stub(List.of(
            tx(now.minusMonths(1), "SPOTIFY", "-9.99"),
            tx(now, "SPOTIFY", "-9.99")
        ));

        assertThat(service.detect(MEMBER_ID).subscriptions()).isEmpty();
    }

    @Test
    void irregularIntervals_areNotDetectedAsRecurring() {
        LocalDate base = LocalDate.now().minusDays(90);
        stub(List.of(
            tx(base, "VIREMENT DIVERS", "-50.00"),
            tx(base.plusDays(10), "VIREMENT DIVERS", "-50.00"),
            tx(base.plusDays(60), "VIREMENT DIVERS", "-50.00"),
            tx(base.plusDays(90), "VIREMENT DIVERS", "-50.00")
        ));

        assertThat(service.detect(MEMBER_ID).subscriptions()).isEmpty();
    }

    @Test
    void weeklyCadence_isDetectedAndConvertedToMonthlyEquivalent() {
        LocalDate now = LocalDate.now();
        stub(List.of(
            tx(now.minusDays(21), "PRESSING HEBDO", "-5.00"),
            tx(now.minusDays(14), "PRESSING HEBDO", "-5.00"),
            tx(now.minusDays(7), "PRESSING HEBDO", "-5.00"),
            tx(now, "PRESSING HEBDO", "-5.00")
        ));

        SubscriptionsResponse response = service.detect(MEMBER_ID);
        Subscription sub = response.subscriptions().get(0);

        assertThat(sub.cadence()).isEqualTo(Cadence.WEEKLY);
        assertThat(sub.status()).isEqualTo(Status.ACTIVE);
        // 5.00 * 52 / 12 = 21.67
        assertThat(response.totalMonthlyCost()).isEqualByComparingTo("21.67");
    }

    @Test
    void differentCurrency_isListedButExcludedFromTotal() {
        LocalDate now = LocalDate.now();
        stub(List.of(
            // Dominant currency: EUR (3 rows) vs USD (3 rows for the recurring one) — EUR wins on volume.
            tx(now.minusMonths(3), "LOYER", "-800.00", "EUR"),
            tx(now.minusMonths(2), "LOYER", "-800.00", "EUR"),
            tx(now.minusMonths(1), "LOYER", "-800.00", "EUR"),
            tx(now, "LOYER", "-800.00", "EUR"),
            tx(now.minusMonths(3), "US STREAMING CO", "-12.00", "USD"),
            tx(now.minusMonths(2), "US STREAMING CO", "-12.00", "USD"),
            tx(now.minusMonths(1), "US STREAMING CO", "-12.00", "USD")
        ));

        SubscriptionsResponse response = service.detect(MEMBER_ID);

        assertThat(response.currency()).isEqualTo("EUR");
        assertThat(response.subscriptions()).hasSize(2);
        assertThat(response.totalMonthlyCost()).isEqualByComparingTo("800.00");
    }

    @Test
    void normalizeMerchant_stripsDigitsAndPunctuationSoReferencesDontFragmentTheGroup() {
        assertThat(RecurringSubscriptionService.normalizeMerchant("PRLV SEPA NETFLIX.COM 4498217 15/01"))
            .isEqualTo(RecurringSubscriptionService.normalizeMerchant("PRLV SEPA NETFLIX.COM 5512890 15/02"));
        assertThat(RecurringSubscriptionService.normalizeMerchant(null)).isEmpty();
    }
}
