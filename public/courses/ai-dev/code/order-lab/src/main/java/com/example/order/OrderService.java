package com.example.order;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.util.List;
import java.util.UUID;

public class OrderService {

    private final InMemoryOrderRepository repository;
    private final DiscountPolicy discountPolicy;
    private final Clock clock;

    public OrderService(InMemoryOrderRepository repository, DiscountPolicy discountPolicy, Clock clock) {
        this.repository = repository;
        this.discountPolicy = discountPolicy;
        this.clock = clock;
    }

    public Order create(String customerId, List<OrderItem> items) {
        if (items == null || items.isEmpty()) throw new IllegalArgumentException("订单至少要有一件商品");
        Order order = new Order(UUID.randomUUID().toString(), customerId, items, clock.instant());
        repository.save(order);
        return order;
    }

    /** 应付金额 = 商品总额 - 满减，保留两位小数。 */
    public BigDecimal payableAmount(String orderId) {
        Order order = get(orderId);
        BigDecimal total = order.itemsTotal();
        return total.subtract(discountPolicy.discountFor(total)).setScale(2, RoundingMode.HALF_UP);
    }

    public void pay(String orderId) {
        Order order = get(orderId);
        if (order.getStatus() != OrderStatus.CREATED) {
            throw new IllegalStateException("只有待支付的订单可以支付，当前状态：" + order.getStatus());
        }
        order.setStatus(OrderStatus.PAID);
    }

    public void ship(String orderId) {
        Order order = get(orderId);
        if (order.getStatus() != OrderStatus.PAID) {
            throw new IllegalStateException("只有已支付的订单可以发货，当前状态：" + order.getStatus());
        }
        order.setStatus(OrderStatus.SHIPPED);
    }

    public void cancel(String orderId) {
        Order order = get(orderId);
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("订单已取消");
        }
        order.setStatus(OrderStatus.CANCELLED);
    }

    private Order get(String orderId) {
        return repository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("订单不存在：" + orderId));
    }
}
