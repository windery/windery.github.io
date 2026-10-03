create table product (
    id    bigint primary key,
    name  varchar(100)   not null,
    price decimal(12, 2) not null
);

create table orders (
    id             bigint auto_increment primary key,
    customer_id    varchar(64)    not null,
    status         varchar(20)    not null,
    total_amount   decimal(12, 2) not null,
    payable_amount decimal(12, 2) not null,
    created_at     timestamp(6)   not null,
    paid_at        timestamp(6)
);

create table order_item (
    order_id     bigint         not null references orders (id),
    product_id   bigint         not null,
    product_name varchar(100)   not null,
    unit_price   decimal(12, 2) not null,
    quantity     int            not null
);

insert into product (id, name, price) values
    (1, '机械键盘', 399.00),
    (2, '显示器支架', 159.00),
    (3, 'USB-C 扩展坞', 239.00),
    (4, '鼠标垫', 29.90);
