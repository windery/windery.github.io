package com.example.shop.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import com.example.shop.TestClockConfig;
import com.example.shop.common.BusinessException;
import com.example.shop.common.NotFoundException;

@SpringBootTest
@Import(TestClockConfig.class)
@Transactional
class OrderServiceTest {

    @Autowired
    OrderService service;

    private Order createOrder() {
        return service.create(new CreateOrderRequest("c-1", List.of(
                new CreateOrderRequest.Line(1L, 1),      // 399.00
                new CreateOrderRequest.Line(4L, 2))));  // 29.90 x 2
    }

    @Test
    void createComputesTotalFromCurrentPrices() {
        Order order = createOrder();

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CREATED);
        assertThat(order.getTotalAmount()).isEqualByComparingTo("458.80");
        assertThat(order.getPayableAmount()).isEqualByComparingTo("458.80");
        assertThat(order.getCreatedAt()).isEqualTo(TestClockConfig.NOW);
    }

    @Test
    void createRejectsUnknownProduct() {
        var request = new CreateOrderRequest("c-1", List.of(new CreateOrderRequest.Line(99L, 1)));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("99");
    }

    @Test
    void payMarksOrderPaid() {
        Order order = service.pay(createOrder().getId());

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PAID);
        assertThat(order.getPaidAt()).isEqualTo(TestClockConfig.NOW);
    }

    @Test
    void cannotPayTwice() {
        Long id = createOrder().getId();
        service.pay(id);

        assertThatThrownBy(() -> service.pay(id)).isInstanceOf(BusinessException.class);
    }

    @Test
    void cannotCancelPaidOrder() {
        Long id = createOrder().getId();
        service.pay(id);

        assertThatThrownBy(() -> service.cancel(id)).isInstanceOf(BusinessException.class);
    }

    @Test
    void cancelCreatedOrder() {
        Order order = service.cancel(createOrder().getId());

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(order.getPayableAmount()).isEqualByComparingTo(new BigDecimal("458.80"));
    }
}
