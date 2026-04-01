/**
 * Tango Gestión v25 REST API service.
 *
 * API pattern: {TANGO_API_URL}/api/{Action}?process={ProcessId}&...
 * Auth headers: ApiAuthorization + Company
 *
 * Process IDs (from TangoDeltaApi SDK):
 *   87   = Artículos
 *   2117 = Clientes
 *   952  = Vendedores
 *   19845 = Pedidos
 *   984  = Lista de Precios Ventas
 *   2941 = Depósitos
 *   960  = Transporte
 */

const TANGO_URL = process.env.TANGO_API_URL || "http://cc400d745aa4.sn.mynetname.net:47000";
const TANGO_TOKEN = process.env.TANGO_API_TOKEN || "";
const TANGO_COMPANY = process.env.TANGO_COMPANY_ID || "5";

// Process IDs
export const TANGO_PROCESS = {
  ARTICULOS: 87,
  CLIENTES: 2117,
  VENDEDORES: 952,
  PEDIDOS: 19845,
  LISTA_PRECIOS: 984,
  DEPOSITOS: 2941,
  TRANSPORTE: 960,
} as const;

export interface TangoResponse<T = unknown> {
  succeeded: boolean;
  message: string | null;
  exceptionInfo: { title: string; messages: string[]; detailMessages: string[] } | null;
  resultData: T;
}

export interface TangoPaginatedData<T = Record<string, unknown>> {
  list: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Raw Tango field types
export interface TangoArticuloRaw {
  ID_STA11: number;
  COD_STA11: string;
  DESCRIPCIO: string;
  SINONIMO: string;
  COD_BARRA: string;
  FECHA_ALTA: string | null;
  FAMILIA: string | null;
  GRUPO: string | null;
  STOCK: boolean;
  MEDIDA_STOCK_CODIGO: string;
  MEDIDA_VENTAS_CODIGO: string;
  MEDIDA_STOCK_DESCRIPCION: string;
  [key: string]: unknown;
}

export interface TangoClienteRaw {
  ID_GVA14: number;
  COD_GVA14: string;
  RAZON_SOCI: string;
  NOM_COM: string;
  CUIT: string;
  TELEFONO_1: string;
  E_MAIL: string;
  DOMICILIO: string;
  LOCALIDAD: string;
  C_POSTAL: string | null;
  HABILITADO: boolean;
  FECHA_ALTA: string | null;
  [key: string]: unknown;
}

export interface TangoVendedorRaw {
  ID_GVA23: number;
  COD_GVA23: string;
  NOMBRE_VEN: string;
  INHABILITA: boolean;
  E_MAIL: string;
  TELEFONO: string;
  [key: string]: unknown;
}

const defaultHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
  ApiAuthorization: TANGO_TOKEN,
  Company: TANGO_COMPANY,
};

async function tangoFetch<T>(
  action: string,
  processId: number,
  params: Record<string, string> = {},
  options: RequestInit = {}
): Promise<TangoResponse<T>> {
  const url = new URL(`${TANGO_URL}/api/${action}`);
  url.searchParams.set("process", String(processId));
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    });

    const data = await res.json();
    return data as TangoResponse<T>;
  } catch (error) {
    console.error("[Tango] API error:", (error as Error).message);
    return {
      succeeded: false,
      message: `Tango unreachable: ${(error as Error).message}`,
      exceptionInfo: null,
      resultData: null as T,
    };
  }
}

export const tangoService = {
  // ─── ARTICULOS ──────────────────────────────────────────
  async getArticulos(pageIndex = 0, pageSize = 50) {
    return tangoFetch<TangoPaginatedData<TangoArticuloRaw>>(
      "Get",
      TANGO_PROCESS.ARTICULOS,
      { pageSize: String(pageSize), pageIndex: String(pageIndex), view: "" }
    );
  },

  async getArticuloById(id: number) {
    return tangoFetch<TangoArticuloRaw>(
      "GetById",
      TANGO_PROCESS.ARTICULOS,
      { view: "", id: String(id) }
    );
  },

  async getArticulosByFilter(filtroSql: string) {
    return tangoFetch<TangoPaginatedData<TangoArticuloRaw>>(
      "GetByFilter",
      TANGO_PROCESS.ARTICULOS,
      { view: "", filtroSql }
    );
  },

  async createArticulo(data: Record<string, unknown>) {
    return tangoFetch<unknown>("Create", TANGO_PROCESS.ARTICULOS, {}, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateArticulo(data: Record<string, unknown>) {
    return tangoFetch<unknown>("Update", TANGO_PROCESS.ARTICULOS, {}, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteArticulo(id: number) {
    return tangoFetch<unknown>(
      "Delete",
      TANGO_PROCESS.ARTICULOS,
      { id: String(id) },
      { method: "DELETE" }
    );
  },

  // ─── CLIENTES ──────────────────────────────────────────
  async getClientes(pageIndex = 0, pageSize = 50) {
    return tangoFetch<TangoPaginatedData<TangoClienteRaw>>(
      "Get",
      TANGO_PROCESS.CLIENTES,
      { pageSize: String(pageSize), pageIndex: String(pageIndex), view: "" }
    );
  },

  async getClienteById(id: number) {
    return tangoFetch<TangoClienteRaw>(
      "GetById",
      TANGO_PROCESS.CLIENTES,
      { view: "", id: String(id) }
    );
  },

  async getClientesByFilter(filtroSql: string) {
    return tangoFetch<TangoPaginatedData<TangoClienteRaw>>(
      "GetByFilter",
      TANGO_PROCESS.CLIENTES,
      { view: "", filtroSql }
    );
  },

  // ─── VENDEDORES ────────────────────────────────────────
  async getVendedores(pageIndex = 0, pageSize = 50) {
    return tangoFetch<TangoPaginatedData<TangoVendedorRaw>>(
      "Get",
      TANGO_PROCESS.VENDEDORES,
      { pageSize: String(pageSize), pageIndex: String(pageIndex), view: "" }
    );
  },

  // ─── PEDIDOS ───────────────────────────────────────────
  async getPedidos(pageIndex = 0, pageSize = 50) {
    return tangoFetch<TangoPaginatedData>(
      "Get",
      TANGO_PROCESS.PEDIDOS,
      { pageSize: String(pageSize), pageIndex: String(pageIndex), view: "" }
    );
  },

  async getPedidoById(id: number) {
    return tangoFetch<Record<string, unknown>>(
      "GetById",
      TANGO_PROCESS.PEDIDOS,
      { view: "", id: String(id) }
    );
  },

  async createPedido(data: Record<string, unknown>) {
    return tangoFetch<unknown>("Create", TANGO_PROCESS.PEDIDOS, {}, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ─── GENERIC ───────────────────────────────────────────
  async getAllPages<T>(
    processId: number,
    pageSize = 50,
    maxPages = 100
  ): Promise<T[]> {
    const all: T[] = [];
    for (let page = 0; page < maxPages; page++) {
      const res = await tangoFetch<TangoPaginatedData<T>>(
        "Get",
        processId,
        { pageSize: String(pageSize), pageIndex: String(page), view: "" }
      );
      if (!res.succeeded || !res.resultData?.list) break;
      all.push(...res.resultData.list);
      if (!res.resultData.hasNextPage) break;
    }
    return all;
  },
};
