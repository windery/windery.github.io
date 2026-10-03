package com.example.order;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class OrderServiceTest {

    private OrderService service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-10-01T02:00:00Z"), ZoneId.of("Asia/Shanghai"));
        service = new OrderService(new InMemoryOrderRepository(), new DiscountPolicy(), clock);
    }

    private static OrderItem item(String price, int quantity) {
        return new OrderItem("SKU-1", new BigDecimal(price), quantity);
    }

    @Test
    void payableAmountWithoutDiscount() {
        Order order = service.create("c1", List.of(item("49.90", 2)));
        assertEquals(new BigDecimal("99.80"), service.payableAmount(order.getId()));
    }

    @Test
    void payableAmountWithLevel1Discount() {
        Order order = service.create("c1", List.of(item("100.00", 2)));
        assertEquals(new BigDecimal("180.00"), service.payableAmount(order.getId()));
    }

    @Test
    void payableAmountWithLevel2Discount() {
        Order order = service.create("c1", List.of(item("250.00", 2)));
        assertEquals(new BigDecimal("420.00"), service.payableAmount(order.getId()));
    }

    @Test
    void createRejectsEmptyItems() {
        assertThrows(IllegalArgumentException.class, () -> service.create("c1", List.of()));
    }

    @Test
    void cannotShipUnpaidOrder() {
        Order order = service.create("c1", List.of(item("10.00", 1)));
        assertThrows(IllegalStateException.class, () -> service.ship(order.getId()));
    }

    @Test
    void normalFlow() {
        Order order = service.create("c1", List.of(item("10.00", 1)));
        service.pay(order.getId());
        service.ship(order.getId());
        assertEquals(OrderStatus.SHIPPED, order.getStatus());
    }
}
