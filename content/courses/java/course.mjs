// Java 深入与架构：课程元数据与完整大纲。
// 每节课的正文在 lessons/<id>.mjs；没有正文文件的课在目录中显示为“待写”。
// 生成网页：node scripts/build-java-course.mjs

export const course = {
  name: 'Java 深入与架构',
  short: 'J.',
  storageKey: 'java-depth-course-v1',
  updated: '2026-10-03',
  jdk: 'JDK 21.0.11',
  description: '面向有经验的 Java 后端工程师：从 JVM、并发到架构，读懂代码在运行时真正发生了什么。',
};

export const stages = [
  {
    title: 'JVM 运行时：从源码到运行',
    lessons: [
      ['l01', '0001-jvm-process', '一个 Java 进程里有什么', '用 jcmd 和 MXBean 看清 JVM 自己启动的线程、GC 与参数。'],
      ['l02', '0002-class-loading', '类加载：双亲委派与类的身份', '同名的两个类为什么可以不相等，框架为什么需要自己的加载器。'],
      ['l03', '0003-bytecode', '字节码：用 javap 看编译器替你做了什么', '自动装箱、字符串拼接、比较运算在字节码里各是什么样。'],
      ['l04', '0004-object-layout', '对象在内存里长什么样', '用 JOL 读出对象头、字段重排与对齐填充，估算真实内存。'],
      ['l05', '0005-jit', 'JIT：分层编译与逃逸分析', '为什么同一段代码越跑越快，以及 new 出来的对象可能根本不在堆上。'],
    ],
  },
  {
    title: '内存与垃圾回收',
    lessons: [
      ['l06', '0006-memory-areas', '堆、栈、元空间与直接内存', '把 OutOfMemoryError 的每种消息对应到具体内存区域。'],
      ['l07', '0007-gc-basics', 'GC 基础：可达性、分代与停顿', '从 GC Roots 出发理解“垃圾”的定义和分代假设。'],
      ['l08', '0008-g1-zgc', 'G1 与 ZGC：怎么选，怎么读日志', '读懂一行 GC 日志，按延迟与吞吐目标选择收集器。'],
      ['l09', '0009-references-leaks', '引用类型与内存泄漏排查', '强、软、弱、虚引用的语义，用堆转储找到泄漏源。'],
    ],
  },
  {
    title: '并发：从内存模型到虚拟线程',
    lessons: [
      ['l10', '0010-jmm', 'Java 内存模型：happens-before', '为什么没有同步的读可能永远看不到写。'],
      ['l11', '0011-synchronized-volatile', 'synchronized 与 volatile 的真实语义', '互斥、可见性和有序性分别由谁保证。'],
      ['l12', '0012-aqs', 'AQS 与 ReentrantLock', '一个状态位加一个等待队列，撑起大半个 java.util.concurrent。'],
      ['l13', '0013-thread-pool', '线程池：参数、队列与拒绝策略', '读懂 ThreadPoolExecutor 的任务提交路径，避开默认配置的坑。'],
      ['l14', '0014-completablefuture', 'CompletableFuture 与异步编排', '回调运行在哪个线程，异常沿哪条路传播。'],
      ['l15', '0015-virtual-threads', '虚拟线程与结构化并发', '虚拟线程适合什么负载，pinning 是什么，旧代码要改什么。'],
      ['l16', '0016-concurrent-hashmap', 'ConcurrentHashMap 的设计', '分段 CAS、扩容协助和弱一致迭代如何配合。'],
    ],
  },
  {
    title: '语言与类库的深层机制',
    lessons: [
      ['l17', '0017-generics-erasure', '泛型与类型擦除', '擦除后还剩什么类型信息，桥方法从哪里来。'],
      ['l18', '0018-modern-java', '现代 Java：record、sealed 与模式匹配', '用代数数据类型的思路建模业务状态。'],
      ['l19', '0019-reflection-proxy', '反射、动态代理与注解处理', '框架“魔法”的三种实现方式与各自代价。'],
      ['l20', '0020-io-models', 'I/O 模型：BIO、NIO 与 Netty 的 Reactor', '从一次 read 系统调用到事件循环。'],
    ],
  },
  {
    title: '框架原理：Spring 是怎么工作的',
    lessons: [
      ['l21', '0021-spring-ioc', 'Spring IoC：Bean 的一生', '从 BeanDefinition 到 BeanPostProcessor，看容器在启动时做了什么。'],
      ['l22', '0022-spring-aop-tx', 'Spring AOP 与事务的边界', '为什么自调用让 @Transactional 失效，传播行为怎么读。'],
      ['l23', '0023-spring-boot-autoconfig', 'Spring Boot 自动配置', '条件注解如何决定哪个 Bean 最终生效。'],
    ],
  },
  {
    title: '性能与线上诊断',
    lessons: [
      ['l24', '0024-jmh', 'JMH：写对一个微基准', '死代码消除、常量折叠和预热如何骗过手写计时。'],
      ['l25', '0025-profiling', 'JFR 与 async-profiler：找到热点', '读火焰图，区分 CPU、分配和锁等待。'],
      ['l26', '0026-troubleshooting', '线上问题排查清单', 'CPU 飙高、内存上涨、线程卡死的标准取证步骤。'],
    ],
  },
  {
    title: '架构：从单体到分布式',
    lessons: [
      ['l27', '0027-boundaries', '分层、六边形与 DDD 的边界', '依赖方向比目录结构更重要。'],
      ['l28', '0028-consistency', '分布式一致性：幂等、Saga 与 Outbox', '在没有分布式事务的前提下保证业务正确。'],
      ['l29', '0029-caching', '缓存设计：一致性、穿透与雪崩', '先决定能容忍多旧的数据，再选更新策略。'],
      ['l30', '0030-kafka', '消息队列：Kafka 的分区、顺序与重复', '至少一次投递下，消费者必须自己处理什么。'],
      ['l31', '0031-resilience', '稳定性：限流、熔断与降级', '用 Resilience4j 的状态机理解熔断器。'],
      ['l32', '0032-observability', '可观测性：日志、指标与链路', '用 OpenTelemetry 把一次请求串起来。'],
    ],
  },
  {
    title: '走向 AI 应用开发',
    lessons: [
      ['l33', '0033-java-llm', '在 Java 里调用大模型', '对比 Spring AI 与 LangChain4j 的抽象：模型、提示、工具调用。'],
      ['l34', '0034-rag-service', '架构实战：设计一个 RAG 服务', '把检索、生成、缓存与评估放进可演进的服务边界。'],
    ],
  },
];

// 课程依赖的开源项目。slug 对应 content/catalog.json 中的项目；有 slug 的会链接到项目介绍。
export const projects = [
  { name: 'openjdk/jol', slug: 'openjdk-jol', usedIn: '第 04 节', note: '读取对象头、字段偏移与对齐填充。' },
  { name: 'openjdk/jmh', usedIn: '第 24 节', note: 'OpenJDK 官方微基准框架。' },
  { name: 'async-profiler/async-profiler', usedIn: '第 25 节', note: '低开销 CPU 与分配采样器。' },
  { name: 'netty/netty', usedIn: '第 20 节', note: '事件驱动网络框架。' },
  { name: 'spring-projects/spring-framework', usedIn: '第 21–22 节', note: 'IoC 容器、AOP 与事务。' },
  { name: 'spring-projects/spring-boot', usedIn: '第 23 节', note: '自动配置与启动流程。' },
  { name: 'apache/kafka', usedIn: '第 30 节', note: '分区日志与消费者组。' },
  { name: 'resilience4j/resilience4j', usedIn: '第 31 节', note: '熔断、限流、重试。' },
  { name: 'langchain4j/langchain4j', usedIn: '第 33–34 节', note: 'Java 的 LLM 应用框架。' },
];
