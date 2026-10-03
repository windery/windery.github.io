export default {
  minutes: '15–20 分钟',
  understand: {
    title: '先建立一个判断方法',
    html: `
<p>从 JDK 9 起，一个普通应用至少有三层类加载器。bootstrap 加载器由 JVM 用 C++ 实现，负责 <code>java.base</code> 等核心模块，在 Java 代码里表现为 <code>null</code>；platform 加载器负责 <code>java.sql</code> 等平台模块，它取代了 JDK 8 的 extension 加载器；app 加载器（也叫 system 加载器）负责 classpath 和 module path 上的应用类。</p>
<p><code>ClassLoader.loadClass</code> 的默认流程是双亲委派：先看自己是否已经加载过这个名字，没有就交给父加载器，父加载器找不到时才调用自己的 <code>findClass</code> 去读字节码。这样核心类只会有一份，应用也无法用自己写的 <code>java.lang.String</code> 冒充核心类。</p>
<p>判断两个类是否相同，要同时看两样东西：全限定名，以及定义它的加载器（defining loader）。同一份 .class 文件被两个加载器各自定义，就是两个互不兼容的运行时类型：静态字段各有一份，实例之间不能互相强转。</p>
<p>很多框架会有意改变默认委派。Tomcat 为每个 web 应用创建独立加载器，优先加载应用自己 <code>WEB-INF</code> 下的类，以便隔离不同应用的依赖；<code>ServiceLoader</code> 和 JDBC 通过线程上下文加载器（TCCL），让核心库找到应用提供的实现；热部署则是丢弃整棵旧加载器，换一个新加载器重新加载类。</p>`,
  },
  sourceNotes: [
    ['JVM 规范 §5.3 · 创建与加载', 'https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-5.html#jvms-5.3'],
    ['JDK 21 API · ClassLoader', 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ClassLoader.html'],
  ],
  example: {
    file: 'L02.java',
    prompt: '先预测最后三行：两个加载器读的是同一个文件，“同一个类”会是 true 吗？新建的对象是 Payload 的实例吗？',
    output: `String 的加载器: null
L02 的加载器: app
它的父加载器: platform
名字相同: true
同一个类: false
instanceof Payload: false`,
    explain: [
      '<code>String</code> 由 bootstrap 加载器定义，所以 <code>getClassLoader()</code> 返回 null。这不代表“没有加载器”。',
      'a 和 b 的父加载器都是 platform。platform 在平台模块里找不到 <code>L02$Payload</code>，于是 a、b 各自从同一个目录读取同一个 .class 并定义它，得到两个不同的 <code>Class</code> 对象。',
      '源码里写的 <code>Payload</code> 解析为 app 加载器定义的那个类，和 a 定义的不是同一个，所以 instanceof 为 false。如果此时写 <code>(Payload) o</code>，会抛出 <code>ClassCastException: class L02$Payload cannot be cast to class L02$Payload</code>，异常消息会分别注明两边的加载器。',
    ],
  },
  misread: '“全限定名相同就是同一个类”只在只有一个加载器的世界里成立。看到“X cannot be cast to X”时，不要怀疑编译器，先读异常消息里两个类各自属于哪个加载器。',
  quiz: {
    question: '把示例中两个 URLClassLoader 的父加载器从 platform 改为 app（L02.class.getClassLoader()），“同一个类”会输出什么？',
    options: ['仍然是 false', '变成 true', '抛出 ClassNotFoundException'],
    correct: 1,
    explanation: '双亲委派会先问父加载器。app 加载器能在 classpath 上找到 L02$Payload，于是 a、b 都返回 app 定义的同一个类，instanceof Payload 也变成 true。',
  },
  recall: {
    question: '一个使用 Spring Boot DevTools 的项目，在开发环境偶尔报 “com.acme.Order cannot be cast to com.acme.Order”。用本节的规则解释原因，并说出你会先查什么。',
    answer: 'DevTools 把项目自己的类放进一个可丢弃的 restart 加载器，依赖 jar 留在 base 加载器。重启后，如果有对象被 base 一侧的组件持有（例如进程内缓存或反序列化时用了错误的加载器），它的类属于旧的或另一个加载器，与新加载器里的同名类不相等。先读异常消息中两个 <code>Order</code> 各自的 loader，再找出是谁创建或缓存了这个对象。',
  },
  sources: `<p>首选原始资料：<a href="https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-5.html">JVM 规范第 5 章：加载、链接与初始化</a>、<a href="https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ClassLoader.html">ClassLoader API</a>。规范 §5.3 明确写出：运行时类由“二进制名 + 定义加载器”共同确定。</p>`,
};
