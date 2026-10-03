# shop-api

「Vibe Coding 与 Agent 原理」第四部分的练习项目：一个最小的电商订单服务。

- Spring Boot 4.1、Java 21、Maven
- Spring Data JPA + H2 内存数据库，表结构由 Flyway 管理
- 已有功能：按商品下单、查询订单、支付、取消

## 运行

```sh
mvn test             # 运行全部测试
mvn spring-boot:run  # 启动服务，端口 8080
```

启动后可以用 curl 试一下：

```sh
# 下单：1 个机械键盘 + 2 个鼠标垫
curl -s -X POST localhost:8080/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"c-1","items":[{"productId":1,"quantity":1},{"productId":4,"quantity":2}]}'

curl -s localhost:8080/api/orders/1             # 查询
curl -s -X POST localhost:8080/api/orders/1/pay  # 支付
```

数据库里预置了 4 个商品，见 `src/main/resources/db/migration/V1__init.sql`。

## 代码结构

```
com.example.shop
├── ShopApplication      启动类，提供 Clock bean
├── common               异常和统一的错误响应（ProblemDetail）
├── product              商品（只读）
└── order                订单：实体、仓库、服务、接口、请求和响应对象
```

## 约定

- 金额一律用 `BigDecimal`，数据库里是 `decimal(12, 2)`。
- 需要当前时间时注入 `Clock`，不要直接调用 `Instant.now()`。
- 业务规则不满足时抛 `BusinessException`（409），资源不存在抛 `NotFoundException`（404）。
- 表结构只能通过新增 Flyway 脚本修改，不要改已有的脚本。
- 接口测试不加 `@Transactional`，让请求像线上一样在事务之外完成序列化。
