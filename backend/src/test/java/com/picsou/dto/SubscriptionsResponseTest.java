package com.picsou.dto;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SubscriptionsResponseTest {

    @Test
    void rejectsNegativeTotalMonthlyCost() {
        assertThatThrownBy(() -> new SubscriptionsResponse(new BigDecimal("-1"), "EUR", List.of()))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsNullFields() {
        assertThatThrownBy(() -> new SubscriptionsResponse(null, "EUR", List.of()))
            .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new SubscriptionsResponse(BigDecimal.ZERO, null, List.of()))
            .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new SubscriptionsResponse(BigDecimal.ZERO, "EUR", null))
            .isInstanceOf(NullPointerException.class);
    }
}
