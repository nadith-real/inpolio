import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIsoDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isValidDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function toDateOnly(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!isValidDate(value)) return "";
  return todayIsoDate(new Date(value));
}

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function clampNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function roundMoney(value: number): number {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

export function calcLineTotals(
  items: { quantity: number; unitPrice: number }[],
  discount: number,
  taxRate: number,
) {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice), 0),
  );
  const discountAmount = roundMoney(Math.min(clampNonNegative(discount), subtotal));
  const taxable = roundMoney(subtotal - discountAmount);
  const tax = roundMoney(taxable * (toNumber(taxRate) / 100));
  const total = roundMoney(taxable + tax);
  return { subtotal, discount: discountAmount, tax, total };
}

export function formatMoney(amount: number, currency = "LKR"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(toNumber(amount));
  } catch {
    return `${currency} ${toNumber(amount).toFixed(2)}`;
  }
}

export function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(y, m - 1, d));
  }
  if (!isValidDate(value)) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  if (!isValidDate(value)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function matchesQuery(haystack: string, query: string): boolean {
  if (!query.trim()) return true;
  return haystack.toLowerCase().includes(query.trim().toLowerCase());
}

export function sortBy<T>(items: T[], key: keyof T, dir: "asc" | "desc" = "asc"): T[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") {
      return dir === "asc" ? av - bv : bv - av;
    }
    const as = String(av ?? "").toLowerCase();
    const bs = String(bv ?? "").toLowerCase();
    return dir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
  });
  return copy;
}

export function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function rangeStart(range: "today" | "7d" | "30d" | "90d" | "year"): Date {
  const now = new Date();
  if (range === "today") return startOfDay(now);
  if (range === "year") return new Date(now.getFullYear(), 0, 1);
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const d = startOfDay(now);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

export function inRange(iso: string, from: Date, to: Date): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    const t = new Date(y, m - 1, d).getTime();
    return t >= from.getTime() && t <= to.getTime();
  }
  if (!isValidDate(iso)) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function nextNumber(prefix: string, existing: string[]): string {
  let max = 0;
  const re = new RegExp(`^${prefix}-(\\d+)$`, "i");
  for (const value of existing) {
    const m = value.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
