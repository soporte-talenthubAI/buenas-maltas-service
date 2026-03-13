import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5433/buenas_maltas?schema=public";

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── USERS ──────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 10);
  const driverPassword = await bcrypt.hash("driver123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@buenasmaltas.com" },
    update: {},
    create: {
      email: "admin@buenasmaltas.com",
      name: "Gabriel Admin",
      password: adminPassword,
      role: "admin",
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: "chofer@buenasmaltas.com" },
    update: {},
    create: {
      email: "chofer@buenasmaltas.com",
      name: "Carlos Repartidor",
      password: driverPassword,
      role: "repartidor",
    },
  });

  console.log("Users created:", { admin: admin.email, driver: driver.email });

  // ─── CUSTOMERS ──────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { code: "CLI-001" },
      update: {},
      create: {
        code: "CLI-001",
        commercial_name: "Bar El Refugio",
        contact_name: "Martín Pérez",
        phone: "351-456-7890",
        email: "elrefugio@gmail.com",
        cuit: "30-71234567-8",
        iva_condition: "Responsable Inscripto",
        street: "Av. Hipólito Yrigoyen",
        street_number: "350",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.4135,
        longitude: -64.1811,
        has_time_restriction: true,
        delivery_window_start: "10:00",
        delivery_window_end: "14:00",
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-002" },
      update: {},
      create: {
        code: "CLI-002",
        commercial_name: "Restaurante La Parrilla",
        contact_name: "Ana García",
        phone: "351-567-8901",
        email: "laparrilla@gmail.com",
        cuit: "30-72345678-9",
        iva_condition: "Responsable Inscripto",
        street: "Bv. San Juan",
        street_number: "1200",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.4246,
        longitude: -64.1888,
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-003" },
      update: {},
      create: {
        code: "CLI-003",
        commercial_name: "Almacén Don Roberto",
        contact_name: "Roberto Sánchez",
        phone: "351-678-9012",
        email: "donroberto@gmail.com",
        cuit: "20-12345678-0",
        iva_condition: "Monotributista",
        street: "Av. Colón",
        street_number: "800",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.4201,
        longitude: -64.1935,
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-004" },
      update: {},
      create: {
        code: "CLI-004",
        commercial_name: "Cervecería Antares",
        contact_name: "Lucas Fernández",
        phone: "351-789-0123",
        email: "antares.cba@gmail.com",
        cuit: "30-73456789-0",
        iva_condition: "Responsable Inscripto",
        street: "Achával Rodríguez",
        street_number: "150",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.4275,
        longitude: -64.1862,
        has_time_restriction: true,
        delivery_window_start: "08:00",
        delivery_window_end: "12:00",
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-005" },
      update: {},
      create: {
        code: "CLI-005",
        commercial_name: "Hotel Quorum",
        contact_name: "María López",
        phone: "351-890-1234",
        email: "compras@hotelquorum.com",
        cuit: "30-74567890-1",
        iva_condition: "Responsable Inscripto",
        street: "San Jerónimo",
        street_number: "500",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.4165,
        longitude: -64.1838,
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-006" },
      update: {},
      create: {
        code: "CLI-006",
        commercial_name: "Pub The Wall",
        contact_name: "Diego Torres",
        phone: "351-901-2345",
        email: "thewall.pub@gmail.com",
        cuit: "30-75678901-2",
        iva_condition: "Responsable Inscripto",
        street: "Av. Rafael Núñez",
        street_number: "4200",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.3785,
        longitude: -64.2315,
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-007" },
      update: {},
      create: {
        code: "CLI-007",
        commercial_name: "Supermercado La Economía",
        contact_name: "Patricia Ruiz",
        phone: "351-012-3456",
        email: "laeconomia@gmail.com",
        cuit: "30-76789012-3",
        iva_condition: "Responsable Inscripto",
        street: "Av. Sabattini",
        street_number: "3500",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.4052,
        longitude: -64.1455,
        has_time_restriction: true,
        delivery_window_start: "07:00",
        delivery_window_end: "11:00",
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-008" },
      update: {},
      create: {
        code: "CLI-008",
        commercial_name: "Restaurante El Papagayo",
        contact_name: "Julio Herrera",
        phone: "351-123-4567",
        email: "elpapagayo@gmail.com",
        cuit: "30-77890123-4",
        iva_condition: "Responsable Inscripto",
        street: "Obispo Trejo",
        street_number: "170",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.4198,
        longitude: -64.1867,
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-009" },
      update: {},
      create: {
        code: "CLI-009",
        commercial_name: "Vinoteca & Birra",
        contact_name: "Sofía Martínez",
        phone: "351-234-5678",
        email: "vinotecabirra@gmail.com",
        cuit: "30-78901234-5",
        iva_condition: "Responsable Inscripto",
        street: "Caseros",
        street_number: "600",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.4220,
        longitude: -64.1910,
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-010" },
      update: {},
      create: {
        code: "CLI-010",
        commercial_name: "Distribuidora Norte",
        contact_name: "Esteban Gómez",
        phone: "351-345-6789",
        email: "distnorte@gmail.com",
        cuit: "30-79012345-6",
        iva_condition: "Responsable Inscripto",
        street: "Av. Fuerza Aérea",
        street_number: "2800",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.3920,
        longitude: -64.2105,
      },
    }),
  ]);

  console.log(`Customers created: ${customers.length}`);

  // ─── PRODUCTS (as order items in orders below) ──────────────
  const products = [
    { code: "IPA-500", name: "IPA Buenas Maltas 500ml", price: 2500 },
    { code: "IPA-1L", name: "IPA Buenas Maltas 1L", price: 4200 },
    { code: "STOUT-500", name: "Stout Buenas Maltas 500ml", price: 2700 },
    { code: "STOUT-1L", name: "Stout Buenas Maltas 1L", price: 4500 },
    { code: "BLONDE-500", name: "Blonde Ale 500ml", price: 2300 },
    { code: "BLONDE-1L", name: "Blonde Ale 1L", price: 3900 },
    { code: "RED-500", name: "Red Ale 500ml", price: 2600 },
    { code: "RED-1L", name: "Red Ale 1L", price: 4300 },
    { code: "WHEAT-500", name: "Wheat Beer 500ml", price: 2400 },
    { code: "BARREL-20L", name: "Barril Chopp 20L", price: 28000 },
    { code: "BARREL-50L", name: "Barril Chopp 50L", price: 62000 },
  ];

  // ─── ORDERS ─────────────────────────────────────────────────
  const statuses = [
    "pendiente",
    "confirmado",
    "documentado",
    "en_ruta",
    "entregado",
  ] as const;

  const priorities = ["baja", "normal", "alta", "urgente"] as const;

  for (let i = 1; i <= 25; i++) {
    const customer = customers[i % customers.length];
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - Math.floor(Math.random() * 15));

    // Pick 2-4 random products for this order
    const numItems = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    const selectedProducts = shuffled.slice(0, numItems);

    const items = selectedProducts.map((p) => {
      const qty = 1 + Math.floor(Math.random() * 12);
      return {
        product_code: p.code,
        product_name: p.name,
        quantity: qty,
        unit_price: p.price,
        subtotal: qty * p.price,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discount = Math.random() > 0.7 ? 5 : 0;
    const total = subtotal * (1 - discount / 100);

    const orderNumber = `PED-${String(i).padStart(4, "0")}`;

    await prisma.order.upsert({
      where: { order_number: orderNumber },
      update: {},
      create: {
        order_number: orderNumber,
        customer_id: customer.id,
        order_date: orderDate,
        delivery_date: new Date(
          orderDate.getTime() + 2 * 24 * 60 * 60 * 1000
        ),
        status,
        priority,
        subtotal,
        discount,
        total,
        observations:
          i % 5 === 0 ? "Entregar por puerta trasera" : undefined,
        created_by_id: admin.id,
        items: {
          create: items,
        },
      },
    });
  }

  console.log("Orders created: 25");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
