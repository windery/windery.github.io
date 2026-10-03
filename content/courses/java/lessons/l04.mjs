export default {
  minutes: '20–25 分钟',
  understand: {
    title: '先建立一个判断方法',
    html: `
<p>在 64 位 HotSpot 上，一个普通对象由三部分组成：对象头、实例字段、对齐填充。对象头包括 8 字节的 mark word（存放哈希码、GC 年龄和锁状态）和 class pointer（指向类元数据）。class pointer 默认被压缩成 4 字节，所以普通对象头是 12 字节；数组还要再加 4 字节长度。</p>
<p>对象大小按 8 字节对齐。字段在内存里也不按声明顺序排列：HotSpot 会按字段大小分组，并尽量把小字段塞进对象头后面的空隙。具体顺序属于实现细节，不同 JDK 版本可能不同，所以要测量，不要背规则。</p>
<p>引用字段的大小取决于 compressed oops。堆小于约 32 GB 时，JVM 用 4 字节保存引用；堆超过这个界限，压缩自动关闭，每个引用变成 8 字节。因此把堆从 31 GB 调到 33 GB，能放下的对象可能反而更少。</p>
<p>JDK 24 的 JEP 450 引入了实验性的 compact object headers，JDK 25 由 JEP 519 转为正式特性：开启 <code>-XX:+UseCompactObjectHeaders</code> 后，对象头缩小到 8 字节。小对象多的服务（缓存、消息、图结构）收益最明显。</p>
<p>本节用 OpenJDK 的 JOL（Java Object Layout）读取真实布局。它是一个小 jar，读取的是当前运行中的 JVM 的字段偏移，不是理论推算。项目本身的用法和原理见 <a href="/projects/openjdk-jol/01/">openjdk/jol 项目介绍</a>。</p>`,
  },
  sourceNotes: [
    ['openjdk/jol 源码与示例', 'https://github.com/openjdk/jol'],
    ['JEP 519 · Compact Object Headers', 'https://openjdk.org/jeps/519'],
  ],
  example: {
    file: 'L04.java',
    check: false,
    deps: 'jol',
    prompt: 'Order 的四个字段声明加起来是 1 + 8 + 4 + 4 = 17 字节。先预测：一个 Order 实例实际占多少字节？字段会按声明顺序排吗？',
    output: `java.lang.Object object internals:
OFF  SZ   TYPE DESCRIPTION               VALUE
  0   8        (object header: mark)     0x0000000000000001 (non-biasable; age: 0)
  8   4        (object header: class)    0x00000e90
 12   4        (object alignment gap)
Instance size: 16 bytes
Space losses: 0 bytes internal + 4 bytes external = 4 bytes total

L04$Order object internals:
OFF  SZ               TYPE DESCRIPTION               VALUE
  0   8                    (object header: mark)     N/A
  8   4                    (object header: class)    N/A
 12   4                int Order.quantity            N/A
 16   8               long Order.id                  N/A
 24   1            boolean Order.paid                N/A
 25   3                    (alignment/padding gap)
 28   4   java.lang.String Order.sku                 N/A
Instance size: 32 bytes
Space losses: 3 bytes internal + 0 bytes external = 3 bytes total`,
    outputNote: 'JDK 21、x86_64、默认参数。输出前 JOL 还会打印一两行 # WARNING，说明它无法动态 attach 或使用 Serviceability Agent；这不影响字段布局结果。class 列的值会随运行变化。',
    explain: [
      '<code>new Object()</code> 没有字段，也要占 16 字节：12 字节对象头，加 4 字节对齐到 8 的倍数。',
      'Order 的字段被重排：<code>int quantity</code> 被放进对象头后偏移 12 的空隙；<code>long id</code> 需要 8 字节对齐，从 16 开始；boolean 后留下 3 字节空隙，引用 <code>sku</code> 占 4 字节（compressed oops）。17 字节的数据最终占用 32 字节。',
      '这 32 字节只是 Order 本身，不含 sku 指向的 String 对象和它内部的 byte[]。估算缓存内存时要沿引用把整张对象图加起来，JOL 的 <code>GraphLayout.parseInstance(x).toFootprint()</code> 就是做这件事的。',
      '加上 <code>-XX:-UseCompressedOops</code> 再运行，sku 变成 8 字节，Order 增长到 40 字节；class pointer 仍是 4 字节，因为压缩类指针是另一个独立开关。',
    ],
  },
  misread: '“对象大小 = 各字段大小之和”忽略了对象头和对齐。对于只有一两个字段的小对象，头部和填充往往比数据本身还大。包装类型尤其如此：一个 <code>Long</code> 占 24 字节，而它包含的数据只有 8 字节。',
  quiz: {
    question: 'JDK 21 默认参数下，一个只有一个 int 字段的类，每个实例占多少字节？',
    options: ['4 字节', '12 字节', '16 字节', '24 字节'],
    correct: 2,
    explanation: '12 字节对象头之后正好有 4 字节可以放 int，合计 16 字节，已经是 8 的倍数，不需要额外填充。',
  },
  recall: {
    question: '用一个 HashMap<Long, Long> 缓存 100 万条记录，key 和 value 都在 1000 以上。原始数据是 100 万 × 16 字节 = 16 MB。按本节的规则估算实际占用，再说出你会怎样降低它。',
    answer: '每条记录有一个 <code>HashMap.Node</code>（12 头 + hash 4 + key/value/next 三个引用各 4 = 28，对齐到 32 字节）和两个 <code>Long</code>（各 24 字节），合计 80 字节；再加上容量为 2<sup>21</sup> 的桶数组约 8 MB。总计约 88 MB，是原始数据的 5 倍多。用 JOL 的 GraphLayout 实测结果是 88,388,672 字节。降低方法：改用存原始类型的集合（如 Eclipse Collections、fastutil 的 LongLongMap），或在 JDK 25 上开启 compact object headers，后者能把每个对象头减少 4 字节。',
  },
  sources: `<p>首选原始资料：<a href="https://github.com/openjdk/jol">openjdk/jol</a>（尤其是 jol-samples 目录中的几十个布局示例）、<a href="https://openjdk.org/jeps/450">JEP 450</a> 与 <a href="https://openjdk.org/jeps/519">JEP 519</a>。本站的 <a href="/projects/openjdk-jol/01/">openjdk/jol 项目介绍</a> 解释了 JOL 如何拿到这些偏移。</p>`,
};
