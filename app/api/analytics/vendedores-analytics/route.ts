import { NextResponse } from "next/server";
import { analyticsService } from "@/lib/services/analytics.service";

export async function GET() {
  try {
    const data = await analyticsService.getVendedoresAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
