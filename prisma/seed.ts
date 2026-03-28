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
  console.log("Seeding database (usuarios + KPI targets)...");

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

  console.log("Users created:", {
    admin: admin.email,
    driver: driver.email,
    vendedor: vendedor.email,
  });

  // ─── KPI TARGETS ──────────────────────────────────────────────
  // Objetivos de negocio reales — los datos de clientes, productos
  // y pedidos se sincronizan desde Tango ERP.
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

  console.log("\nSeed completado. Datos de negocio se sincronizan desde Tango ERP.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
