export default {
  minutes: '15–20 分钟',
  understand: {
    title: '先建立一个判断方法',
    html: `
<p>执行 <code>java -cp out L01</code> 之后，main 方法并不是第一件发生的事。JVM 先解析参数，按机器条件推导默认配置（HotSpot 称为 ergonomics），选定垃圾收集器和堆大小，启动自己的工作线程，然后才加载主类，在名为 main 的线程里调用 <code>main</code>。</p>
<p>这些线程分两类。第一类有 <code>Thread</code> 对象，Java 代码能看到：除了 main，还有处理引用队列的 Reference Handler、运行 <code>finalize</code> 的 Finalizer（finalization 已在 JDK 18 由 JEP 421 标记为待移除）、处理操作系统信号的 Signal Dispatcher、服务 <code>java.lang.ref.Cleaner</code> 的 Common-Cleaner。第二类是 JVM 内部线程：GC 线程、JIT 编译线程、执行 safepoint 操作的 VM Thread 等。它们不出现在 <code>Thread.getAllStackTraces()</code> 里，但 <code>jcmd &lt;pid&gt; Thread.print</code> 会全部列出。</p>
<p>默认配置不是固定值。JDK 21 在“服务器级机器”上默认使用 G1；可用处理器少于 2 个，或可用内存低于约 1792 MB 时，会退回 Serial。默认最大堆是可用内存的 1/4（<code>MaxRAMPercentage=25</code>）。在容器里，“可用”指容器限额，所以一个 1 核的 Pod 会悄悄换成单线程的 Serial GC。</p>
<div class="table-scroll"><table><thead><tr><th>想知道</th><th>命令</th></tr></thead><tbody>
<tr><td>机器上有哪些 Java 进程</td><td><code>jcmd</code></td></tr>
<tr><td>最终生效的参数（含推导值）</td><td><code>jcmd &lt;pid&gt; VM.flags</code></td></tr>
<tr><td>所有线程及其栈</td><td><code>jcmd &lt;pid&gt; Thread.print</code></td></tr>
<tr><td>堆的分区与占用</td><td><code>jcmd &lt;pid&gt; GC.heap_info</code></td></tr>
<tr><td>某个进程支持哪些命令</td><td><code>jcmd &lt;pid&gt; help</code></td></tr>
</tbody></table></div>`,
  },
  sourceNotes: [
    ['JDK 21 · jcmd 工具文档', 'https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html'],
    ['HotSpot GC 调优指南 · Ergonomics', 'https://docs.oracle.com/en/java/javase/21/gctuning/ergonomics.html'],
  ],
  example: {
    file: 'L01.java',
    check: false,
    prompt: '先预测：输出里会有几个线程？会出现 GC 线程吗？会列出哪种收集器？',
    output: `JVM: OpenJDK 64-Bit Server VM
当前线程: main
线程: [Common-Cleaner, Finalizer, Notification Thread, Reference Handler, Signal Dispatcher, main]
GC: G1 Young Generation
GC: G1 Concurrent GC
GC: G1 Old Generation`,
    outputNote: '在 4 核、16 GB 的 Linux 机器上以 JDK 21 运行。线程名单和 GC 名称会随 JDK 版本与机器条件变化。',
    explain: [
      'main 只是六个 Java 线程之一，其余五个都是 daemon 线程，由 JVM 在调用 main 之前创建。',
      '名单里没有任何 GC 线程或编译线程。同一进程用 <code>jcmd &lt;pid&gt; Thread.print</code> 查看，还能看到 C1/C2 CompilerThread、VM Thread、GC Thread#0、G1 Conc#0 等十多个线程。',
      'GC MXBean 的名字暴露了收集器：三个 G1 开头的 bean 说明 ergonomics 选择了 G1。若以 <code>-XX:ActiveProcessorCount=1</code> 启动，名字会变成 Copy 与 MarkSweepCompact，也就是 Serial。',
    ],
  },
  misread: '“JVM 默认用 G1”只在服务器级机器上成立。容器限额会改变 ergonomics 的推导结果；线上服务应显式写出收集器和堆大小，或者至少用 <code>jcmd &lt;pid&gt; VM.flags</code> 确认实际生效的值。',
  quiz: {
    question: '在限额 1 个 CPU、4 GB 内存的容器里，不加任何 GC 参数启动 JDK 21，默认使用哪种收集器？',
    options: ['G1', 'Serial', 'ZGC', 'Parallel'],
    correct: 1,
    explanation: '可用处理器少于 2 个时，机器不被视为服务器级，ergonomics 选择 Serial。可以用 -XX:ActiveProcessorCount=1 -Xlog:gc 复现：日志第一行是 Using Serial。',
  },
  recall: {
    question: '线上一个 Java 服务 CPU 很高，但业务日志很安静。只允许用 jcmd，你会先看哪两样东西？为什么只看 Thread.getAllStackTraces() 不够？',
    answer: '先用 <code>jcmd &lt;pid&gt; Thread.print</code> 间隔几秒连续采样，找一直处于 RUNNABLE 且栈相同的业务线程；再用 <code>GC.heap_info</code> 或 GC 日志确认是否在频繁 GC。CPU 可能被 GC 线程或 JIT 编译线程占用，而这些 JVM 内部线程不在 <code>Thread.getAllStackTraces()</code> 的结果里。配合 <code>top -H -p &lt;pid&gt;</code> 找出最忙的系统线程号，与 Thread.print 中的 nid 对照即可定位。',
  },
  sources: `<p>首选原始资料：<a href="https://docs.oracle.com/en/java/javase/21/docs/specs/man/jcmd.html">jcmd 文档</a>、<a href="https://docs.oracle.com/en/java/javase/21/gctuning/ergonomics.html">GC Ergonomics</a>、<a href="https://openjdk.org/jeps/421">JEP 421：弃用 finalization</a>。</p>`,
};
