import type { AppData } from "@/types";
import { normalizeAppData } from "@/lib/storage";

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function downloadJson(data: AppData, filename = "inpolio-backup.json") {
  const blob = new Blob([exportJson(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseImport(raw: string): { ok: true; data: AppData } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Import must be a JSON object." };
  }
  const data = parsed as Record<string, unknown>;
  const hasAny = ["customers", "products", "orders", "invoices", "settings"].some((k) => k in data);
  if (!hasAny) {
    return { ok: false, error: "This file does not look like an Inpolio backup." };
  }
  return { ok: true, data: normalizeAppData(parsed) };
}
