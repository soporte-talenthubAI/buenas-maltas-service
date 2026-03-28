import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/buenas_maltas?schema=public";

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Limpiando datos mockeados...\n");

  // 1. Delete mock orders (PED-XXXX) and their items
  const mockOrders = await prisma.order.findMany({
    where: { order_number: { startsWith: "PED-" } },
    select: { id: true, order_number: true },
  });

  if (mockOrders.length > 0) {
    // Delete route_orders linked to mock orders
    await prisma.routeOrder.deleteMany({
      where: { order_id: { in: mockOrders.map((o) => o.id) } },
    });
    // Delete order items
    await prisma.orderItem.deleteMany({
      where: { order_id: { in: mockOrders.map((o) => o.id) } },
    });
    // Delete documents linked to mock orders
    await prisma.document.deleteMany({
      where: { order_id: { in: mockOrders.map((o) => o.id) } },
    });
    // Delete orders
    await prisma.order.deleteMany({
      where: { id: { in: mockOrders.map((o) => o.id) } },
    });
    console.log(`Pedidos mock eliminados: ${mockOrders.length}`);
  } else {
    console.log("No hay pedidos mock (PED-XXXX)");
  }

  // 2. Delete mock customers (CLI-XXX codes)
  const mockCustomers = await prisma.customer.findMany({
    where: { code: { startsWith: "CLI-" } },
    select: { id: true, code: true, commercial_name: true },
  });

  if (mockCustomers.length > 0) {
    // Check for remaining orders linked to mock customers
    const remainingOrders = await prisma.order.count({
      where: { customer_id: { in: mockCustomers.map((c) => c.id) } },
    });
    if (remainingOrders > 0) {
      console.log(`AVISO: ${remainingOrders} pedidos reales asociados a clientes mock, no se eliminan esos clientes`);
    }

    // Only delete customers with no remaining orders
    for (const c of mockCustomers) {
      const orderCount = await prisma.order.count({ where: { customer_id: c.id } });
      if (orderCount === 0) {
        // Delete visit stops linked to this customer
        await prisma.visitStop.deleteMany({ where: { customer_id: c.id } });
        await prisma.customer.delete({ where: { id: c.id } });
        console.log(`  Cliente eliminado: ${c.code} - ${c.commercial_name}`);
      } else {
        console.log(`  Cliente ${c.code} tiene ${orderCount} pedidos reales, se mantiene`);
      }
    }
  } else {
    console.log("No hay clientes mock (CLI-XXX)");
  }

  // 3. Delete mock products (only those without tango_id and with seed codes)
  const seedProductCodes = [
    "BAR-20L", "BAR-50L", "00201",
  ];
  const mockProducts = await prisma.product.findMany({
    where: {
      code: { in: seedProductCodes },
      tango_id: null,
    },
    select: { id: true, code: true, name: true },
  });

  if (mockProducts.length > 0) {
    for (const p of mockProducts) {
      // Check if product is referenced in order items
      const itemCount = await prisma.orderItem.count({
        where: { product_code: p.code },
      });
      if (itemCount === 0) {
        await prisma.product.delete({ where: { id: p.id } });
        console.log(`  Producto eliminado: ${p.code} - ${p.name}`);
      } else {
        console.log(`  Producto ${p.code} tiene ${itemCount} items de pedido, se mantiene`);
      }
    }
  } else {
    console.log("No hay productos mock sin Tango ID para eliminar");
  }

  // Summary
  const totalCustomers = await prisma.customer.count();
  const tangoCustomers = await prisma.customer.count({ where: { tango_id: { not: null } } });
  const totalProducts = await prisma.product.count();
  const tangoProducts = await prisma.product.count({ where: { tango_id: { not: null } } });
  const totalOrders = await prisma.order.count();

  console.log("\n--- Resumen DB ---");
  console.log(`Clientes: ${totalCustomers} (${tangoCustomers} de Tango)`);
  console.log(`Productos: ${totalProducts} (${tangoProducts} de Tango)`);
  console.log(`Pedidos: ${totalOrders}`);
  console.log("\nLimpieza completada!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
