#!/bin/sh
# 编译并运行一节课的示例。用法：./run.sh l01 [JVM 参数...]
# 例如：./run.sh l05 -XX:-DoEscapeAnalysis
set -e
cd "$(dirname "$0")"
if [ -z "$1" ]; then echo "用法：./run.sh l01 [JVM 参数...]"; exit 2; fi
lesson=$(echo "$1" | tr 'a-z' 'A-Z')
shift
JOL=lib/jol-core-0.17.jar
cp=out
if [ "$lesson" = L04 ]; then
  if [ ! -f "$JOL" ]; then
    echo "第 04 节需要 JOL。先下载："
    echo "  mkdir -p lib && curl -fLo $JOL https://repo1.maven.org/maven2/org/openjdk/jol/jol-core/0.17/jol-core-0.17.jar"
    exit 1
  fi
  cp="out:$JOL"
fi
mkdir -p out
javac -encoding UTF-8 -cp "$cp" -d out "src/$lesson.java"
exec java "$@" -cp "$cp" "$lesson"
