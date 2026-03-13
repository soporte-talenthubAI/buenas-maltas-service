import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "@/lib/services/analytics.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "month") as "week" | "month" | "year";

    const [overview, salesByDay, ordersByStatus, topCustomers, topProducts, routeEfficiency] =
      await Promise.all([
        analyticsService.getSalesOverview(period),
        analyticsService.getSalesByDay(period === "week" ? 7 : period === "month" ? 30 : 365),
        analyticsService.getOrdersByStatus(),
        analyticsService.getTopCustomers(10),
        analyticsService.getTopProducts(10),
        analyticsService.getRouteEfficiency(),
      ]);

    return NextResponse.json({
      overview,
      salesByDay,
      ordersByStatus,
      topCustomers,
      topProducts,
      routeEfficiency,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
