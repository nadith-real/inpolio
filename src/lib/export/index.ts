import type { AppData, WorkspaceRoot } from "@/types";
import { normalizeAppData, normalizeWorkspace } from "@/lib/storage";

export type ImportResult =
  | { ok: true; kind: "workspace"; workspace: WorkspaceRoot }
  | { ok: true; kind: "data"; data: AppData }
  | { ok: false; error: string };

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function exportWorkspaceJson(root: WorkspaceRoot): string {
  return JSON.stringify({ kind: "inpolio-workspace", ...root }, null, 2);
}

export function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(data: AppData, filename = "inpolio-backup.json") {
  downloadText(exportJson(data), filename);
}

export function downloadWorkspaceJson(root: WorkspaceRoot, filename = "inpolio-all-businesses.json") {
  downloadText(exportWorkspaceJson(root), filename);
}

export function parseImport(raw: string): ImportResult {
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
  const isWorkspace =
    data.kind === "inpolio-workspace" ||
    (Array.isArray(data.businesses) && Array.isArray(data.users) && data.workspaces && typeof data.workspaces === "object");
  if (isWorkspace) {
    const workspace = normalizeWorkspace(parsed);
    if (!workspace.businesses.length) {
      return { ok: false, error: "This workspace backup has no businesses." };
    }
    return { ok: true, kind: "workspace", workspace };
  }
  const hasAny = ["customers", "products", "orders", "invoices", "settings"].some((k) => k in data);
  if (!hasAny) {
    return { ok: false, error: "This file does not look like an Inpolio backup." };
  }
  return { ok: true, kind: "data", data: normalizeAppData(parsed) };
}
