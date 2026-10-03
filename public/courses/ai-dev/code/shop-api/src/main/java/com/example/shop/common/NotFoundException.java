package com.example.shop.common;

/** 资源不存在，映射为 404。 */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
