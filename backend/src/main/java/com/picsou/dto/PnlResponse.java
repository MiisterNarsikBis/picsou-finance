package com.picsou.dto;

import java.math.BigDecimal;

public record PnlResponse(
    BigDecimal total,
    BigDecimal invested,
    BigDecimal pnl,
    BigDecimal pnlPercent
) {}
