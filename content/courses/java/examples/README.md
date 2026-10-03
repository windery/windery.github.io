# Java 深入与架构 · 课程示例

每节课的主示例都在 `src/` 下，文件名与课程编号对应（`L01.java` 对应第 01 节）。

需要 JDK 21 或更高版本。课程输出以 JDK 21.0.11（x86_64 Linux）实测。

## 运行

```sh
./run.sh l01
./run.sh l05 -XX:-DoEscapeAnalysis   # 课程名之后可以加 JVM 参数
```

不用脚本时：

```sh
javac -encoding UTF-8 -d out src/L01.java
java -cp out L01
```

第 04 节依赖 JOL（openjdk/jol）。先下载 jar：

```sh
mkdir -p lib
curl -fLo lib/jol-core-0.17.jar https://repo1.maven.org/maven2/org/openjdk/jol/jol-core/0.17/jol-core-0.17.jar
./run.sh l04
```

Windows 下 classpath 分隔符是 `;`，例如 `java -cp "out;lib/jol-core-0.17.jar" L04`。示例会输出中文；如果终端显示乱码，先执行 `chcp 65001`，或给 java 加上 `-Dstdout.encoding=UTF-8`。
