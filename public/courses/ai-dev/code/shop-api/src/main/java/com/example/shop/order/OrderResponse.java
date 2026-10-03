package com.example.shop.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderResponse(
        Long id,
        String customerId,
        OrderStatus status,
        List<Line> items,
        BigDecimal totalAmount,
        BigDecimal payableAmount,
        Instant createdAt,
        Instant paidAt) {

    public record Line(Long productId, String productName, BigDecimal unitPrice, int quantity) {
    }

    static OrderResponse from(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getCustomerId(),
                order.getStatus(),
                order.getItems().stream()
                        .map(i -> new Line(i.getProductId(), i.getProductName(), i.getUnitPrice(), i.getQuantity()))
                        .toList(),
                order.getTotalAmount(),
                order.getPayableAmount(),
                order.getCreatedAt(),
                order.getPaidAt());
    }
}
