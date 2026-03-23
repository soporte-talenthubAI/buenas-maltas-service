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
  const vendedorPassword = await bcrypt.hash("vendedor123", 10);

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

  const vendedor = await prisma.user.upsert({
    where: { email: "vendedor@buenasmaltas.com" },
    update: {},
    create: {
      email: "vendedor@buenasmaltas.com",
      name: "Diego Vendedor",
      password: vendedorPassword,
      role: "vendedor",
    },
  });

  console.log("Users created:", { admin: admin.email, driver: driver.email, vendedor: vendedor.email });

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
        latitude: -31.4240722,
        longitude: -64.1871237,
        has_time_restriction: true,
        delivery_window_start: "10:00",
        delivery_window_end: "14:00",
        sales_channel: "Bar / Restaurante",
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
        latitude: -31.4166083,
        longitude: -64.2019115,
        sales_channel: "Bar / Restaurante",
      },
    }),
    prisma.customer.upsert({
      where: { code: "CLI-003" },
      update: {},
      create: {
        code: "CLI-003",
        commercial_name: "Almacen Don Roberto",
        contact_name: "Roberto Sánchez",
        phone: "351-678-9012",
        email: "donroberto@gmail.com",
        cuit: "20-12345678-0",
        iva_condition: "Monotributista",
        street: "Av. Colón",
        street_number: "800",
        locality: "Córdoba",
        province: "Córdoba",
        latitude: -31.4105023,
        longitude: -64.1940803,
        sales_channel: "Drugstore / Autoservicios / Despensas",
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
        latitude: -31.4247746,
        longitude: -64.1899555,
        has_time_restriction: true,
        delivery_window_start: "08:00",
        delivery_window_end: "12:00",
        sales_channel: "Bar / Restaurante",
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
        latitude: -31.4191899,
        longitude: -64.1778170,
        sales_channel: "Bar / Restaurante",
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
        latitude: -31.3699753,
        longitude: -64.2316219,
        sales_channel: "Bar / Restaurante",
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
        latitude: -31.4314468,
        longitude: -64.1384773,
        has_time_restriction: true,
        delivery_window_start: "07:00",
        delivery_window_end: "11:00",
        sales_channel: "Supermercado",
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
        latitude: -31.4174736,
        longitude: -64.1863140,
        sales_channel: "Bar / Restaurante",
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
        latitude: -31.4156421,
        longitude: -64.1930607,
        sales_channel: "Tienda de bebidas A",
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
        latitude: -31.4310854,
        longitude: -64.2259218,
        sales_channel: "Distribuidor",
      },
    }),
  ]);

  console.log(`Customers created: ${customers.length}`);

  // ─── PRODUCTS ──────────────────────────────────────────────
  // Products matching Excel structure (Tango article codes)
  const productData = [
    // Träumer Bier - Latas 473ml (LAT)
    { code: "0062", name: "WHEAT Lata 473 cm3", price: 3571, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "0061", name: "GOLDEN Lata 473 cm3", price: 3571, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "0063", name: "AMBER Lata 473 cm3", price: 3571, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "0064", name: "PORTER Lata 473 cm3", price: 3571, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "0065", name: "IPA Lata 473 cm3", price: 3929, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "0086", name: "APA Lata 473 cm3", price: 3929, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "0087", name: "LAB Lata 473 cm3", price: 3929, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "0088", name: "Tripel Autoctona Lata 473 cm3", price: 3929, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "181", name: "Session BLONDE Lata 473", price: 3214, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "182", name: "Session HOPPY Lata 473", price: 3214, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    { code: "183", name: "Session RED Lata 473", price: 3214, cost: 2236, brand: "Träumer", category: "cerveza", unit: "lata" },
    // Träumer Bier - Barriles (BAR)
    { code: "BAR-20L", name: "Barril Chopp 20L", price: 28000, cost: 18000, brand: "Träumer", category: "chopp", unit: "barril" },
    { code: "BAR-50L", name: "Barril Chopp 50L", price: 62000, cost: 40000, brand: "Träumer", category: "chopp", unit: "barril" },
    // Beermut (GOL)
    { code: "253", name: "Beermut 473cm3", price: 4286, cost: 1968, brand: "Beermut", category: "beermut", unit: "lata" },
    { code: "254", name: "Beermut con Tonica 473cm3", price: 4286, cost: 1968, brand: "Beermut", category: "beermut", unit: "lata" },
    // Vitea Kombucha (BA)
    { code: "258", name: "Vitea Komb Hibisco lata 473cm3", price: 2714, cost: 1450, brand: "Vitea", category: "kombucha", unit: "lata" },
    { code: "259", name: "Vitea Komb Te Verde lata 473cm", price: 2714, cost: 1450, brand: "Vitea", category: "kombucha", unit: "lata" },
    { code: "260", name: "Vitea Lemon Grass lata 473cm3", price: 2714, cost: 1450, brand: "Vitea", category: "kombucha", unit: "lata" },
    // Mixology (PAR)
    { code: "270", name: "Mixology Listo Apa+gin", price: 3500, cost: 1800, brand: "Mixology", category: "mixology", unit: "lata" },
    { code: "271", name: "Mixology Negroni", price: 3500, cost: 1800, brand: "Mixology", category: "mixology", unit: "lata" },
    // Servicio a terceros
    { code: "00201", name: "Logistica - Venta", price: 23967, cost: 15000, brand: "Servicio", category: "servicio", unit: "unidad" },
  ];

  for (const p of productData) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: { unit_price: p.price, cost_price: p.cost },
      create: {
        code: p.code,
        name: p.name,
        brand: p.brand,
        category: p.category,
        unit_price: p.price,
        cost_price: p.cost,
        unit: p.unit,
      },
    });
  }
  console.log(`Products created: ${productData.length}`);

  // Products reference for order items
  const products = productData.map((p) => ({ code: p.code, name: p.name, price: p.price }));

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

  // ─── KPI TARGETS ──────────────────────────────────────────────
  const kpiTargets = [
    { key: "latas_traumer", label: "Latas Träumer / mes", target_value: 2000, unit: "latas", year: 2026 },
    { key: "latas_vitea", label: "Latas Vitea / mes", target_value: 2000, unit: "latas", year: 2026 },
    { key: "latas_mixology", label: "Latas Mixology / mes", target_value: 500, unit: "latas", year: 2026 },
    { key: "latas_beermut", label: "Latas Beermut / mes", target_value: 500, unit: "latas", year: 2026 },
    { key: "litros_barriles", label: "Litros Barriles / mes", target_value: 2400, unit: "litros", year: 2026 },
    { key: "servicio_terceros", label: "Servicio a Terceros / año", target_value: 30000000, unit: "$", year: 2026 },
  ];

  for (const kpi of kpiTargets) {
    await prisma.kpiTarget.upsert({
      where: { key: kpi.key },
      update: { target_value: kpi.target_value, label: kpi.label, unit: kpi.unit, year: kpi.year },
      create: kpi,
    });
  }
  console.log(`KPI Targets created: ${kpiTargets.length}`);

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
