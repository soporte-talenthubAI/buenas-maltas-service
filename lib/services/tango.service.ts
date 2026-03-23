/**
 * Mock Tango ERP API service.
 * URL will change once real API details are known.
 */

const TANGO_API_BASE = "https://api.tango.com/v1";

interface TangoArticulo {
  code: string;
  name: string;
  brand: string;
  category: string;
  unit_price: number;
  cost_price?: number;
  unit: string;
}

interface TangoResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

async function tangoFetch(path: string, options: RequestInit = {}): Promise<TangoResponse> {
  try {
    const res = await fetch(`${TANGO_API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        // TODO: Add Tango API key/token when available
        // "Authorization": `Bearer ${process.env.TANGO_API_KEY}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      return { success: false, message: `Tango API error: ${res.status} ${res.statusText}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    // Mock mode: if Tango is unreachable, return success with warning
    console.warn("[Tango Mock] API unreachable, simulating success:", (error as Error).message);
    return { success: true, message: "mock_response" };
  }
}

export const tangoService = {
  async syncProduct(product: TangoArticulo): Promise<TangoResponse> {
    return tangoFetch("/articulos", {
      method: "POST",
      body: JSON.stringify(product),
    });
  },

  async updateProduct(code: string, product: Partial<TangoArticulo>): Promise<TangoResponse> {
    return tangoFetch(`/articulos/${code}`, {
      method: "PUT",
      body: JSON.stringify(product),
    });
  },

  async deleteProduct(code: string): Promise<TangoResponse> {
    return tangoFetch(`/articulos/${code}`, {
      method: "DELETE",
    });
  },
};
