package com.picsou.controller;

import com.picsou.dto.SubscriptionsResponse;
import com.picsou.service.RecurringSubscriptionService;
import com.picsou.service.UserContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final RecurringSubscriptionService subscriptionService;
    private final UserContext userContext;

    public SubscriptionController(RecurringSubscriptionService subscriptionService, UserContext userContext) {
        this.subscriptionService = subscriptionService;
        this.userContext = userContext;
    }

    @GetMapping
    public SubscriptionsResponse getSubscriptions() {
        return subscriptionService.detect(userContext.currentMemberId());
    }
}
