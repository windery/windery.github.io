# order-lab

「Vibe Coding 与 Agent 原理」第三部分的练习项目：一个极简的订单服务，没有框架，只有 JDK 和 JUnit 5。

```sh
mvn -q test     # 运行全部测试
```

- `OrderService`：下单、支付、发货、取消，以及订单金额计算。
- `DiscountPolicy`：满减规则。
- `InMemoryOrderRepository`：内存中的订单存储。
