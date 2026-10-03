package com.example.shop.order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.example.shop.common.BusinessException;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String customerId;

    @Enumerated(EnumType.STRING)
    private OrderStatus status;

    /** 订单明细很小，并且每次返回订单都要用到，直接随订单一起加载。 */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "order_item", joinColumns = @JoinColumn(name = "order_id"))
    private List<OrderItem> items = new ArrayList<>();

    /** 商品总价。 */
    private BigDecimal totalAmount;

    /** 应付金额。目前没有任何优惠，等于商品总价。 */
    private BigDecimal payableAmount;

    private Instant createdAt;
    private Instant paidAt;

    protected Order() {
    }

    public Order(String customerId, List<OrderItem> items, Instant createdAt) {
        this.customerId = customerId;
        this.items = new ArrayList<>(items);
        this.status = OrderStatus.CREATED;
        this.totalAmount = items.stream().map(OrderItem::subtotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        this.payableAmount = totalAmount;
        this.createdAt = createdAt;
    }

    public void pay(Instant now) {
        if (status != OrderStatus.CREATED) {
            throw new BusinessException("只有待支付的订单可以支付，当前状态：" + status);
        }
        status = OrderStatus.PAID;
        paidAt = now;
    }

    public void cancel() {
        if (status != OrderStatus.CREATED) {
            throw new BusinessException("只有待支付的订单可以取消，当前状态：" + status);
        }
        status = OrderStatus.CANCELLED;
    }

    public Long getId() {
        return id;
    }

    public String getCustomerId() {
        return customerId;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public List<OrderItem> getItems() {
        return items;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public BigDecimal getPayableAmount() {
        return payableAmount;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getPaidAt() {
        return paidAt;
    }
}
