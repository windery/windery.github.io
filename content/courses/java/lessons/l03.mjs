export default {
  minutes: '15–20 分钟',
  understand: {
    title: '先建立一个判断方法',
    html: `
<p>javac 不做优化，只把语法糖展开成 JVM 指令。所以 <code>javap -c -p</code> 是一面诚实的镜子：源码里看不见的方法调用、隐式转换和临时变量，在字节码里都会写出来。性能优化是运行时 JIT 的工作（下一节会讲）。</p>
<p>JVM 是栈式虚拟机。读字节码时，记住三类指令就能看懂大半：<code>iload</code>、<code>aload</code>、<code>bipush</code> 把值压入操作数栈；<code>istore</code>、<code>astore</code> 把栈顶写回局部变量槽；<code>invoke*</code> 从栈上取参数调用方法，<code>if_*</code> 比较栈顶的值并跳转。</p>
<div class="table-scroll"><table><thead><tr><th>源码</th><th>字节码里实际发生的事</th></tr></thead><tbody>
<tr><td><code>Integer a = 127;</code></td><td><code>invokestatic Integer.valueOf</code>：自动装箱就是一次静态方法调用</td></tr>
<tr><td><code>a == b</code>（两个 Integer）</td><td><code>if_acmpne</code>：比较的是引用，不是数值</td></tr>
<tr><td><code>"n=" + n</code></td><td>JDK 9 起是 <code>invokedynamic makeConcatWithConstants</code>（JEP 280），不再固定编译成 StringBuilder</td></tr>
<tr><td>lambda 表达式</td><td><code>invokedynamic</code> + <code>LambdaMetafactory</code>，首次执行时才生成实现类</td></tr>
</tbody></table></div>
<p><code>Integer.valueOf</code> 会对 -128 到 127 返回缓存中的同一个对象（上限可用 <code>-XX:AutoBoxCacheMax</code> 调大），范围外每次新建。这正是“小整数用 == 碰巧对、大整数用 == 就错”的根源。</p>`,
  },
  sourceNotes: [
    ['JVM 规范第 6 章 · 指令集', 'https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-6.html'],
    ['JDK 21 · javap 工具文档', 'https://docs.oracle.com/en/java/javase/21/docs/specs/man/javap.html'],
  ],
  example: {
    file: 'L03.java',
    prompt: '先预测四行输出，再想一想：label 方法里的字符串拼接会编译成什么？',
    output: `true
false
true
n=3`,
    explain: [
      '四次赋值都编译成 <code>Integer.valueOf</code>。127 落在缓存范围内，a 和 b 指向同一个对象；128 不在范围内，c 和 d 是两个不同的对象。',
      '<code>==</code> 编译成 <code>if_acmpne</code>，只比较引用，所以第二行是 false；<code>equals</code> 比较数值，第三行是 true。',
      'label 方法只有三条指令：加载参数、一条 <code>invokedynamic makeConcatWithConstants</code>、返回。拼接策略在运行时第一次调用时由 <code>StringConcatFactory</code> 决定。',
    ],
    after: `<p>编译后执行 <code>javap -c -p -cp out L03</code>，节选如下（常量池编号可能不同）：</p>
<pre><code>static java.lang.String label(int);
  Code:
     0: iload_0
     1: invokedynamic #7,  0   // InvokeDynamic #0:makeConcatWithConstants:(I)Ljava/lang/String;
     6: areturn

public static void main(java.lang.String[]);
  Code:
     0: bipush        127
     2: invokestatic  #11      // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
     5: astore_1
    ...
    12: sipush        128
    15: invokestatic  #11      // Method java/lang/Integer.valueOf:(I)Ljava/lang/Integer;
    ...
    30: aload_1
    31: aload_2
    32: if_acmpne     39</code></pre>`,
  },
  misread: '“javac 会把 + 拼接优化成 StringBuilder”是 JDK 8 时代的说法。现在看到的是 invokedynamic，具体策略由运行时决定。判断这类问题时，以当前 JDK 的 javap 输出为准，不以旧文章为准。',
  quiz: {
    question: 'Map<String, Long> 里存的计数用 map.get("a") == map.get("b") 比较，两个计数都是 1000。结果通常是什么？',
    options: ['true，因为数值相等', 'false，因为比较的是两个不同的 Long 对象', '编译错误'],
    correct: 1,
    explanation: 'Long.valueOf 同样只缓存 -128 到 127。1000 装箱后是两个不同的对象，== 比较引用得到 false。应使用 equals，或先拆箱成 long 再比较。',
  },
  recall: {
    question: '不运行 javap，说出 for (String s : list) { ... } 编译后大致会出现哪些方法调用；如果 list 换成 String[] 呢？',
    answer: '对 <code>Iterable</code>，增强 for 展开为 <code>invokeinterface List.iterator</code>，循环中反复调用 <code>Iterator.hasNext</code> 和 <code>Iterator.next</code>，再用 <code>checkcast String</code> 把 Object 转回 String（泛型擦除的痕迹）。对数组，展开为基于下标的循环：<code>arraylength</code>、<code>aaload</code> 与 <code>if_icmpge</code>，循环本身不调用任何方法。可以用 javap 自己核对。',
  },
  sources: `<p>首选原始资料：<a href="https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-6.html">JVM 规范第 6 章：指令集</a>、<a href="https://openjdk.org/jeps/280">JEP 280：Indify String Concatenation</a>、<a href="https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Integer.html#valueOf(int)">Integer.valueOf 文档</a>。</p>`,
};
