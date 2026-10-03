package com.example.order;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** 满减规则：满 200 减 20，满 500 减 80，不叠加。结果保留两位小数。 */
public class DiscountPolicy {

    private static final BigDecimal LEVEL_1 = new BigDecimal("200");
    private static final BigDecimal LEVEL_2 = new BigDecimal("500");

    public BigDecimal discountFor(BigDecimal itemsTotal) {
        if (itemsTotal.compareTo(LEVEL_2) >= 0) return new BigDecimal("80.00");
        if (itemsTotal.compareTo(LEVEL_1) >= 0) return new BigDecimal("20.00");
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }
}
