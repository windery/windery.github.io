import java.lang.management.ManagementFactory;

public class L01 {
    public static void main(String[] args) {
        var runtime = ManagementFactory.getRuntimeMXBean();
        System.out.println("JVM: " + runtime.getVmName());
        System.out.println("当前线程: " + Thread.currentThread().getName());
        var names = Thread.getAllStackTraces().keySet().stream()
                .map(Thread::getName).sorted().toList();
        System.out.println("线程: " + names);
        for (var gc : ManagementFactory.getGarbageCollectorMXBeans()) {
            System.out.println("GC: " + gc.getName());
        }
    }
}
