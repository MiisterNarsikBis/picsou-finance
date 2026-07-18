package com.picsou.controller;

import com.picsou.dto.SubscriptionsResponse;
import com.picsou.service.RecurringSubscriptionService;
import com.picsou.service.UserContext;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.QueryTimeoutException;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionControllerTest {

    private static final long MID = 7L;

    @Mock RecurringSubscriptionService subscriptionService;
    @Mock UserContext userContext;

    @Test
    void getSubscriptions_delegatesScopedToCurrentMember() {
        SubscriptionsResponse response = new SubscriptionsResponse(BigDecimal.ZERO, "EUR", List.of());
        when(userContext.currentMemberId()).thenReturn(MID);
        when(subscriptionService.detect(MID)).thenReturn(response);
        SubscriptionController controller = new SubscriptionController(subscriptionService, userContext);

        assertThat(controller.getSubscriptions()).isSameAs(response);
    }

    @Test
    void getSubscriptions_propagatesServiceFailure() {
        when(userContext.currentMemberId()).thenReturn(MID);
        when(subscriptionService.detect(MID)).thenThrow(new QueryTimeoutException("DB unreachable"));
        SubscriptionController controller = new SubscriptionController(subscriptionService, userContext);

        assertThatThrownBy(controller::getSubscriptions).isInstanceOf(QueryTimeoutException.class);
    }
}
