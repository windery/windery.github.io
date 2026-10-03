package com.example.shop.order;

import java.math.BigDecimal;

import jakarta.persistence.Embeddable;

@Embeddable
public class OrderItem {

    private Long productId;
    private String productName;
    private BigDecimal unitPrice;
    private int quantity;

    protected OrderItem() {
    }

    public OrderItem(Long productId, String productName, BigDecimal unitPrice, int quantity) {
        this.productId = productId;
        this.productName = productName;
        this.unitPrice = unitPrice;
        this.quantity = quantity;
    }

    public BigDecimal subtotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }

    public Long getProductId() {
        return productId;
    }

    public String getProductName() {
        return productName;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public int getQuantity() {
        return quantity;
    }
}
