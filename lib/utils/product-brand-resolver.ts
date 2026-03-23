import { prisma } from "@/lib/prisma/client";

export const BRANDS = ["Träumer", "Vitea", "Beermut", "Mixology"] as const;
export type Brand = (typeof BRANDS)[number];

export interface ProductInfo {
  brand: string;
  category: string;
  unit: string;
  costPrice: number | null;
  name: string;
}

const BRAND_NAME_PATTERNS: [string, Brand][] = [
  ["vitea", "Vitea"],
  ["kombucha", "Vitea"],
  ["beermut", "Beermut"],
  ["tonica", "Beermut"],
  ["mixology", "Mixology"],
  ["apa+gin", "Mixology"],
  ["negroni", "Mixology"],
];

let cachedMap: Map<string, ProductInfo> | null = null;

export async function getProductBrandMap(): Promise<Map<string, ProductInfo>> {
  if (cachedMap) return cachedMap;

  const products = await prisma.product.findMany({
    where: { is_active: true },
  });

  const map = new Map<string, ProductInfo>();
  for (const p of products) {
    map.set(p.code, {
      brand: p.brand,
      category: p.category,
      unit: p.unit,
      costPrice: p.cost_price ? Number(p.cost_price) : null,
      name: p.name,
    });
  }

  cachedMap = map;
  return map;
}

export function resolveBrandFromName(productName: string): string {
  const lower = productName.toLowerCase();
  for (const [pattern, brand] of BRAND_NAME_PATTERNS) {
    if (lower.includes(pattern)) return brand;
  }
  if (lower.includes("logistica") || lower.includes("servicio")) return "Servicio";
  return "Träumer";
}

export async function resolveProductBrand(productCode: string, productName: string): Promise<string> {
  const map = await getProductBrandMap();
  const info = map.get(productCode);
  if (info) return info.brand;
  return resolveBrandFromName(productName);
}

export function isLata(productName: string): boolean {
  const lower = productName.toLowerCase();
  return lower.includes("lata") || lower.includes("473") || lower.includes("330");
}

export function isBarril(productName: string): boolean {
  const lower = productName.toLowerCase();
  return lower.includes("barril") || lower.includes("chopp") || lower.includes("20l") || lower.includes("50l");
}

export function invalidateCache() {
  cachedMap = null;
}

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(monthKey: string): string {
  const month = parseInt(monthKey.split("-")[1], 10) - 1;
  return MONTH_NAMES[month] || monthKey;
}

export function generateMonthKeys(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}
