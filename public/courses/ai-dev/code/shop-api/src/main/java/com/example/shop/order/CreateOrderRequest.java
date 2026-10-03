package com.example.shop.order;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record CreateOrderRequest(
        @NotBlank String customerId,
        @NotEmpty List<@Valid Line> items) {

    public record Line(@NotNull Long productId, @Min(1) int quantity) {
    }
}
