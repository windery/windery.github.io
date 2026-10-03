export default {
  minutes: '20–25 分钟',
  understand: {
    title: '先建立一个判断方法',
    html: `
<p>HotSpot 从解释执行开始。方法被调用、循环回跳时，JVM 累加计数器；计数达到阈值，方法会被交给编译器。JDK 8 起默认启用分层编译（tiered compilation）：先由 C1 快速编译并收集类型、分支等 profile，热度继续升高后再由 C2 根据 profile 做激进优化。正在运行的长循环也可以中途切换到编译后的代码，这叫 OSR（on-stack replacement）。</p>
<p>C2 最重要的优化之一是内联：把被调用方法的代码直接展开到调用点。内联之后，编译器能看到更大范围的代码，才有机会做逃逸分析（escape analysis）：如果一个对象从未离开当前编译单元（没有被存进字段、没有被返回、没有传给无法内联的方法），C2 就可以做标量替换（scalar replacement），把对象拆成几个局部变量，根本不在堆上分配。</p>
<p>这带来两个实际结论。第一，“new 一定在堆上分配”在 JIT 之后不总是成立，小的临时对象（例如 record、迭代器、Optional）往往很便宜。第二，刚启动的 JVM 与稳定运行后的 JVM 是两种性能状态，任何不做预热的计时都在测解释器。</p>
<div class="table-scroll"><table><thead><tr><th>观察手段</th><th>作用</th></tr></thead><tbody>
<tr><td><code>-XX:+PrintCompilation</code></td><td>每编译一个方法打印一行，可看到层级（1–4）和 OSR 标记 %</td></tr>
<tr><td><code>-XX:-DoEscapeAnalysis</code></td><td>关闭逃逸分析，用来做对照实验</td></tr>
<tr><td><code>-Xint</code></td><td>只用解释器，不做任何 JIT 编译</td></tr>
<tr><td><code>jcmd &lt;pid&gt; Compiler.codecache</code></td><td>查看 code cache 的使用情况</td></tr>
</tbody></table></div>`,
  },
  sourceNotes: [
    ['HotSpot 虚拟机性能增强 · 逃逸分析', 'https://docs.oracle.com/en/java/javase/21/vm/java-hotspot-virtual-machine-performance-enhancements.html'],
    ['JDK 21 · java 命令参数', 'https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html'],
  ],
  example: {
    file: 'L05.java',
    prompt: 'distance 每次调用都 new 一个 Point。Point 是两个 int 的 record，按上一节的规则占 24 字节。先预测：每轮每次调用平均分配多少字节？关闭逃逸分析后呢？',
    output: `第 1 轮: 每次调用约 0.0 字节 (sum=99999990000000)
第 2 轮: 每次调用约 0.0 字节 (sum=99999990000000)
第 3 轮: 每次调用约 0.0 字节 (sum=99999990000000)`,
    outputNote: 'JDK 21 默认参数。第 1 轮偶尔会显示 0.1，那是编译完成之前的少量分配。',
    explain: [
      '<code>getThreadAllocatedBytes</code> 统计当前线程在堆上分配的字节数。三轮都接近 0，说明 1000 万个 Point 几乎都没有在堆上分配。',
      '原因是 distance 被内联进 run 的循环，C2 发现 p 从未逃出循环体，于是把它拆成 x、y 两个局部变量。长循环在第 1 轮就通过 OSR 切换到了编译后的代码，所以第 1 轮也接近 0。',
      '用 <code>./run.sh l05 -XX:-DoEscapeAnalysis</code> 或 <code>-Xint</code> 再运行，每轮都会稳定显示 24.0 字节，正好是一个 Point 的大小。',
    ],
  },
  misread: '看到这个结果后，不要得出“可以随意 new 对象”的结论。逃逸分析依赖内联，方法太大、调用点是多态的、对象被存进集合或字段，都会让优化失效。是否真的消除了分配，要像本例一样测量。',
  quiz: {
    question: '把 distance 改成先把 Point 加入一个 static List，再计算距离。关闭逃逸分析与否，分配量会怎样？',
    options: ['仍然接近 0', '两种情况下都约 24 字节以上', '只有关闭逃逸分析时才会分配'],
    correct: 1,
    explanation: 'Point 被存进静态集合，逃出了方法，必须在堆上分配。逃逸分析只能优化不逃逸的对象；此时开关与否都会分配（ArrayList 扩容还会带来额外分配）。',
  },
  recall: {
    question: '有人用 System.nanoTime() 包住一个方法调用 100 次，得出“A 比 B 快 3 倍”。按本节的知识列出这个测量至少两个问题。',
    answer: '第一，100 次调用多半还在解释执行或 C1 阶段，测的不是稳定状态。第二，如果结果没有被使用，C2 可能把整段计算当作死代码消除；如果输入是常量，可能被常量折叠。第三，GC、OSR 和编译线程会在测量期间插入噪声。正确做法是用 JMH（第 24 节）：它负责预热、多次 fork、防止死代码消除，并给出误差范围。',
  },
  sources: `<p>首选原始资料：<a href="https://docs.oracle.com/en/java/javase/21/vm/java-hotspot-virtual-machine-performance-enhancements.html">HotSpot 性能增强说明</a>（含 tiered compilation 与 escape analysis 小节）、<a href="https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html">java 命令参数文档</a>。</p>`,
};
