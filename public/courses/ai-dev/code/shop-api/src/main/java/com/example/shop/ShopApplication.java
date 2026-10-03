package com.example.shop;

import java.time.Clock;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class ShopApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShopApplication.class, args);
    }

    /** 业务代码统一从这里取时间，测试里可以替换成固定时钟。 */
    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }
}
