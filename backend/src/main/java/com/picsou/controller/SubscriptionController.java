package com.picsou.controller;

import com.picsou.dto.SubscriptionsResponse;
import com.picsou.service.RecurringSubscriptionService;
import com.picsou.service.UserContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionController.class);

    private final RecurringSubscriptionService subscriptionService;
    private final UserContext userContext;

    public SubscriptionController(RecurringSubscriptionService subscriptionService, UserContext userContext) {
        this.subscriptionService = subscriptionService;
        this.userContext = userContext;
    }

    @GetMapping
    public SubscriptionsResponse getSubscriptions() {
        Long memberId = userContext.currentMemberId();
        try {
            SubscriptionsResponse response = subscriptionService.detect(memberId);
            log.info("Detected {} recurring subscription(s) for memberId={}",
                response.subscriptions().size(), memberId);
            return response;
        } catch (RuntimeException e) {
            log.error("Failed to detect recurring subscriptions for memberId={}", memberId, e);
            throw e;
        }
    }
}
