package com.example.order;

import java.math.BigDecimal;

/** 订单中的一行商品。金额一律用 BigDecimal。 */
public record OrderItem(String sku, BigDecimal unitPrice, int quantity) {

    public OrderItem {
        if (sku == null || sku.isBlank()) throw new IllegalArgumentException("sku 不能为空");
        if (unitPrice == null || unitPrice.signum() < 0) throw new IllegalArgumentException("单价不能为负");
        if (quantity <= 0) throw new IllegalArgumentException("数量必须大于 0");
    }

    public BigDecimal subtotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
}
