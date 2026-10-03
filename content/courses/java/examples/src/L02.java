import java.net.URL;
import java.net.URLClassLoader;

public class L02 {
    public static class Payload {
        public Payload() {}
    }

    public static void main(String[] args) throws Exception {
        System.out.println("String 的加载器: " + String.class.getClassLoader());
        ClassLoader app = L02.class.getClassLoader();
        System.out.println("L02 的加载器: " + app.getName());
        System.out.println("它的父加载器: " + app.getParent().getName());

        URL[] path = { L02.class.getProtectionDomain().getCodeSource().getLocation() };
        ClassLoader platform = ClassLoader.getPlatformClassLoader();
        try (var a = new URLClassLoader(path, platform);
             var b = new URLClassLoader(path, platform)) {
            Class<?> ca = a.loadClass("L02$Payload");
            Class<?> cb = b.loadClass("L02$Payload");
            System.out.println("名字相同: " + ca.getName().equals(cb.getName()));
            System.out.println("同一个类: " + (ca == cb));
            Object o = ca.getDeclaredConstructor().newInstance();
            System.out.println("instanceof Payload: " + (o instanceof Payload));
        }
    }
}
