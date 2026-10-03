package com.example.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public class Order {

    private final String id;
    private final String customerId;
    private final List<OrderItem> items;
    private final Instant createdAt;
    private OrderStatus status = OrderStatus.CREATED;

    public Order(String id, String customerId, List<OrderItem> items, Instant createdAt) {
        this.id = id;
        this.customerId = customerId;
        this.items = List.copyOf(items);
        this.createdAt = createdAt;
    }

    public BigDecimal itemsTotal() {
        return items.stream().map(OrderItem::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public String getId() { return id; }
    public String getCustomerId() { return customerId; }
    public List<OrderItem> getItems() { return items; }
    public Instant getCreatedAt() { return createdAt; }
    public OrderStatus getStatus() { return status; }

    void setStatus(OrderStatus status) { this.status = status; }
}
