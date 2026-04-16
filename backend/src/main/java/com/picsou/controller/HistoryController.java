package com.picsou.controller;

import com.picsou.dto.DashboardResponse;
import com.picsou.dto.PnlResponse;
import com.picsou.service.HistoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryService historyService;

    public HistoryController(HistoryService historyService) {
        this.historyService = historyService;
    }

    @GetMapping
    public List<DashboardResponse.NetWorthPoint> getHistory(
        @RequestParam List<Long> accountIds,
        @RequestParam(defaultValue = "12") int months,
        @RequestParam(defaultValue = "false") boolean split
    ) {
        return historyService.buildHistory(accountIds, months, split);
    }

    @GetMapping("/pnl")
    public PnlResponse getPnl(@RequestParam List<Long> accountIds) {
        return historyService.buildPnl(accountIds);
    }
}
