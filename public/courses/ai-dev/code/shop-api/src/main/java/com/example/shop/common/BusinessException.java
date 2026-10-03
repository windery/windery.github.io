package com.example.shop.common;

/** 违反业务规则，映射为 409。 */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
