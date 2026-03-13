import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.NEXT_PUBLIC_RUTAS_INTELIGENTES_API_URL ??
  "https://v0-micro-saa-s-git-develop-talenthubais-projects.vercel.app";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await fetch(`${API_URL}/api/rutas-inteligentes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-client-id": "buenas-maltas-client",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
