import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "@/lib/services/analytics.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!, 10)
      : undefined;

    const data = await analyticsService.getVendedoresVisitAnalytics(year);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
