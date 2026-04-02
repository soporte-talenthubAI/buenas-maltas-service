import { NextRequest, NextResponse } from "next/server";
import { geocodeService } from "@/lib/services/geocode.service";

/**
 * POST /api/geocode
 * Geocode customers without coordinates using Nominatim (OpenStreetMap).
 * Query params:
 *   - limit: max customers to process (default 50, max 200)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const result = await geocodeService.geocodeCustomers(limit);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
