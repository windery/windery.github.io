package com.example.shop;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** 测试统一使用固定时钟：2026-10-01 10:00（北京时间）。 */
@TestConfiguration
public class TestClockConfig {

    public static final Instant NOW = Instant.parse("2026-10-01T02:00:00Z");

    @Bean
    @Primary
    Clock fixedClock() {
        return Clock.fixed(NOW, ZoneId.of("Asia/Shanghai"));
    }
}
