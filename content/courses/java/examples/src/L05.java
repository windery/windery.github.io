import java.lang.management.ManagementFactory;

public class L05 {
    record Point(int x, int y) {}

    static int distance(int x, int y) {
        Point p = new Point(x, y);
        return Math.abs(p.x()) + Math.abs(p.y());
    }

    static long run(int times) {
        long sum = 0;
        for (int i = 0; i < times; i++) {
            sum += distance(i, -i);
        }
        return sum;
    }

    public static void main(String[] args) {
        var threads = (com.sun.management.ThreadMXBean) ManagementFactory.getThreadMXBean();
        long tid = Thread.currentThread().threadId();
        for (int round = 1; round <= 3; round++) {
            long before = threads.getThreadAllocatedBytes(tid);
            long sum = run(10_000_000);
            long bytes = threads.getThreadAllocatedBytes(tid) - before;
            System.out.printf("第 %d 轮: 每次调用约 %.1f 字节 (sum=%d)%n",
                    round, bytes / 10_000_000.0, sum);
        }
    }
}
