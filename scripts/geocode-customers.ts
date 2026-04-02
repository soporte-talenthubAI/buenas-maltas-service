import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://neondb_owner:npg_H2JF9Phlbpcw@ep-soft-frog-a44qjwkz-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddress(
  street: string,
  locality: string,
  province: string
): Promise<{ lat: number; lng: number } | null> {
  const cleanStreet = street
    .replace(/Piso:\S*/gi, "")
    .replace(/T:\S*/gi, "")
    .replace(/M:\S*/gi, "")
    .replace(/Dpto\.?\s*\S*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const queries = [
    `${cleanStreet}, ${locality}, ${province}, Argentina`,
    `${cleanStreet}, ${locality}, Córdoba, Argentina`,
    `${locality}, ${province}, Argentina`,
  ];

  for (const q of queries) {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", q);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "ar");

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "BuenasMaltasService/1.0" },
      });

      if (!res.ok) continue;

      const results: NominatimResult[] = await res.json();
      if (results.length > 0) {
        return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function main() {
  console.log("Geocodificando clientes sin coordenadas...\n");
  console.log(`Database: ${DATABASE_URL.includes("neon") ? "Neon (producción)" : "Local"}\n`);

  const customers = await prisma.customer.findMany({
    where: {
      latitude: null,
      street: { not: "" },
      NOT: { street: "Sin especificar" },
    },
    select: {
      id: true,
      commercial_name: true,
      street: true,
      locality: true,
      province: true,
    },
    orderBy: { commercial_name: "asc" },
  });

  console.log(`${customers.length} clientes para geocodificar\n`);

  let geocoded = 0;
  let failed = 0;

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    try {
      const result = await geocodeAddress(c.street, c.locality, c.province);

      if (result) {
        await prisma.customer.update({
          where: { id: c.id },
          data: { latitude: result.lat, longitude: result.lng },
        });
        geocoded++;
        if (geocoded % 25 === 0 || i < 5) {
          console.log(`  ✓ [${i + 1}/${customers.length}] ${c.commercial_name} → ${result.lat}, ${result.lng}`);
        }
      } else {
        failed++;
        if (failed <= 10) {
          console.log(`  ✗ [${i + 1}/${customers.length}] ${c.commercial_name}: "${c.street}, ${c.locality}" → sin resultado`);
        }
      }

      // Nominatim rate limit: 1 req/sec
      await sleep(1100);

      // Progress every 50
      if ((i + 1) % 50 === 0) {
        console.log(`\n  Progreso: ${i + 1}/${customers.length} (${geocoded} OK, ${failed} fallidos)\n`);
      }
    } catch (e) {
      failed++;
      if (failed <= 10) {
        console.log(`  ✗ [${i + 1}/${customers.length}] ${c.commercial_name}: ${(e as Error).message}`);
      }
    }
  }

  // Summary
  const total = await prisma.customer.count();
  const withCoords = await prisma.customer.count({ where: { latitude: { not: null } } });

  console.log(`\n=== Resultado ===`);
  console.log(`Procesados: ${customers.length}`);
  console.log(`Geocodificados: ${geocoded}`);
  console.log(`Fallidos: ${failed}`);
  console.log(`\nClientes con coordenadas: ${withCoords} / ${total}`);
}

main()
  .catch((e) => {
    console.error("Error:", e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
