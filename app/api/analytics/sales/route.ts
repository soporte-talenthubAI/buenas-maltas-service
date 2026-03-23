import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "@/lib/services/analytics.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom") || undefined;
    const dateTo = searchParams.get("dateTo") || undefined;
    const origin = searchParams.get("origin") ?? undefined;

    const data = await analyticsService.getSalesAnalytics(dateFrom, dateTo, origin);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
