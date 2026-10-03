package com.example.shop.order;

import java.time.Clock;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.shop.common.NotFoundException;
import com.example.shop.product.Product;
import com.example.shop.product.ProductRepository;

@Service
public class OrderService {

    private final OrderRepository orders;
    private final ProductRepository products;
    private final Clock clock;

    public OrderService(OrderRepository orders, ProductRepository products, Clock clock) {
        this.orders = orders;
        this.products = products;
        this.clock = clock;
    }

    @Transactional
    public Order create(CreateOrderRequest request) {
        List<OrderItem> items = request.items().stream().map(line -> {
            Product product = products.findById(line.productId())
                    .orElseThrow(() -> new NotFoundException("商品不存在：" + line.productId()));
            return new OrderItem(product.getId(), product.getName(), product.getPrice(), line.quantity());
        }).toList();
        return orders.save(new Order(request.customerId(), items, clock.instant()));
    }

    @Transactional(readOnly = true)
    public Order get(Long id) {
        return orders.findById(id).orElseThrow(() -> new NotFoundException("订单不存在：" + id));
    }

    @Transactional
    public Order pay(Long id) {
        Order order = get(id);
        order.pay(clock.instant());
        return order;
    }

    @Transactional
    public Order cancel(Long id) {
        Order order = get(id);
        order.cancel();
        return order;
    }
}
