import org.openjdk.jol.info.ClassLayout;

public class L04 {
    static class Order {
        boolean paid;
        long id;
        int quantity;
        String sku;
    }

    public static void main(String[] args) {
        System.out.println(ClassLayout.parseInstance(new Object()).toPrintable());
        System.out.println(ClassLayout.parseClass(Order.class).toPrintable());
    }
}
