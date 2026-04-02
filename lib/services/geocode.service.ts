import { prisma } from "@/lib/prisma/client";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Geocode an address using Nominatim (OpenStreetMap) - free, no API key needed.
 * Rate limit: 1 request per second (we add delay between calls).
 */
async function geocodeAddress(
  street: string,
  locality: string,
  province: string
): Promise<{ lat: number; lng: number } | null> {
  // Clean up address
  const cleanStreet = street
    .replace(/Piso:\S*/gi, "")
    .replace(/T:\S*/gi, "")
    .replace(/M:\S*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Try with full address first
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const geocodeService = {
  geocodeAddress,

  /**
   * Geocode customers that don't have coordinates yet.
   * Respects Nominatim rate limit (1 req/sec).
   */
  async geocodeCustomers(limit = 50): Promise<{
    processed: number;
    geocoded: number;
    failed: number;
    errors: string[];
  }> {
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
      take: limit,
    });

    let geocoded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const customer of customers) {
      try {
        const result = await geocodeAddress(
          customer.street,
          customer.locality,
          customer.province
        );

        if (result) {
          await prisma.customer.update({
            where: { id: customer.id },
            data: { latitude: result.lat, longitude: result.lng },
          });
          geocoded++;
        } else {
          failed++;
          if (errors.length < 10) {
            errors.push(`${customer.commercial_name}: sin resultados para "${customer.street}, ${customer.locality}"`);
          }
        }

        // Nominatim rate limit: 1 req/sec
        await sleep(1100);
      } catch (e) {
        failed++;
        if (errors.length < 10) {
          errors.push(`${customer.commercial_name}: ${(e as Error).message}`);
        }
      }
    }

    return { processed: customers.length, geocoded, failed, errors };
  },
};
