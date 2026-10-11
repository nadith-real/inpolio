import type { Business, Permission, Role, Session, User, WorkspaceRoot } from "@/types";
import { PERMISSIONS } from "@/types";
import { DEFAULT_ROLES, OWNER_ROLE_ID } from "@/lib/auth/permissions";
import { createId, nowIso, safeJsonParse } from "@/lib/utils";
import type { StorageAdapter } from "./adapter";
import { EMPTY_DATA, STORAGE_KEY } from "./defaults";
import { normalizeAppData } from "./normalize";

export const WORKSPACE_KEY = "inpolio.workspace.v2";
export const SESSION_KEY = "inpolio.session.v1";
export const LEGACY_STORAGE_KEY = STORAGE_KEY;

export const DEFAULT_BUSINESS_ID = "biz-default";
export const DEFAULT_OWNER_ID = "user-owner";

export function emptyWorkspace(): WorkspaceRoot {
  const business: Business = {
    id: DEFAULT_BUSINESS_ID,
    name: "My business",
    createdAt: nowIso(),
  };
  return {
    version: 2,
    businesses: [business],
    users: [],
    roles: DEFAULT_ROLES.map((r) => ({ ...r, permissions: [...r.permissions] })),
    workspaces: {
      [DEFAULT_BUSINESS_ID]: structuredClone(EMPTY_DATA),
    },
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function normalizeRole(raw: Record<string, unknown>): Role {
  const id = asString(raw.id, createId());
  const system = DEFAULT_ROLES.find((r) => r.id === id);
  const perms = asArray<string>(raw.permissions).filter((p): p is Permission =>
    (PERMISSIONS as readonly string[]).includes(p),
  );
  return {
    id,
    name: asString(raw.name, system?.name ?? "Role"),
    description: asString(raw.description, system?.description ?? ""),
    permissions: system?.isSystem && id === OWNER_ROLE_ID ? [...DEFAULT_ROLES[0].permissions] : perms.length ? perms : (system?.permissions ?? []),
    isSystem: system ? true : asBool(raw.isSystem),
  };
}

function normalizeUser(raw: Record<string, unknown>): User {
  return {
    id: asString(raw.id, createId()),
    username: asString(raw.username).trim().toLowerCase(),
    displayName: asString(raw.displayName, asString(raw.username, "User")),
    passwordHash: asString(raw.passwordHash),
    roleId: asString(raw.roleId, OWNER_ROLE_ID),
    businessIds: asArray<string>(raw.businessIds).filter(Boolean),
    active: asBool(raw.active, true),
    createdAt: asString(raw.createdAt, nowIso()),
    lastLoginAt: asString(raw.lastLoginAt) || undefined,
  };
}

function normalizeBusiness(raw: Record<string, unknown>): Business {
  return {
    id: asString(raw.id, createId()),
    name: asString(raw.name, "Business"),
    createdAt: asString(raw.createdAt, nowIso()),
  };
}

export function normalizeWorkspace(raw: unknown): WorkspaceRoot {
  const fallback = emptyWorkspace();
  if (!raw || typeof raw !== "object") return fallback;
  const data = raw as Record<string, unknown>;
  const businesses = uniqueById(asArray<Record<string, unknown>>(data.businesses).map(normalizeBusiness));
  const users = uniqueById(asArray<Record<string, unknown>>(data.users).map(normalizeUser)).filter((u) => u.username);
  const customRoles = uniqueById(asArray<Record<string, unknown>>(data.roles).map(normalizeRole));
  const roleMap = new Map<string, Role>();
  for (const role of DEFAULT_ROLES) roleMap.set(role.id, { ...role, permissions: [...role.permissions] });
  for (const role of customRoles) {
    const existing = roleMap.get(role.id);
    if (existing?.isSystem) {
      if (role.id !== OWNER_ROLE_ID) {
        roleMap.set(role.id, { ...existing, permissions: role.permissions.length ? role.permissions : existing.permissions });
      }
      continue;
    }
    roleMap.set(role.id, role);
  }
  const workspacesRaw = (data.workspaces ?? {}) as Record<string, unknown>;
  const workspaces: WorkspaceRoot["workspaces"] = {};
  const bizIds = new Set(businesses.map((b) => b.id));
  for (const [id, value] of Object.entries(workspacesRaw)) {
    if (!bizIds.has(id)) continue;
    workspaces[id] = normalizeAppData(value);
  }
  if (!businesses.length) {
    return fallback;
  }
  for (const biz of businesses) {
    if (!workspaces[biz.id]) workspaces[biz.id] = structuredClone(EMPTY_DATA);
  }
  return {
    version: 2,
    businesses,
    users,
    roles: [...roleMap.values()],
    workspaces,
  };
}

export function migrateLegacyIfNeeded(adapter: StorageAdapter): WorkspaceRoot | null {
  const existing = adapter.getItem(WORKSPACE_KEY);
  if (existing) return null;
  const legacy = adapter.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return null;
  const parsed = safeJsonParse<unknown>(legacy);
  if (!parsed) return null;
  const data = normalizeAppData(parsed);
  const root = emptyWorkspace();
  const name = data.settings.businessName?.trim() || "My business";
  root.businesses[0].name = name;
  root.workspaces[DEFAULT_BUSINESS_ID] = data;
  adapter.setItem(WORKSPACE_KEY, JSON.stringify(root));
  return root;
}

export function loadWorkspace(adapter: StorageAdapter): WorkspaceRoot {
  const migrated = migrateLegacyIfNeeded(adapter);
  if (migrated) return migrated;
  const raw = adapter.getItem(WORKSPACE_KEY);
  if (!raw) return emptyWorkspace();
  const parsed = safeJsonParse<unknown>(raw);
  if (!parsed) return emptyWorkspace();
  return normalizeWorkspace(parsed);
}

export function saveWorkspace(adapter: StorageAdapter, root: WorkspaceRoot): void {
  adapter.setItem(WORKSPACE_KEY, JSON.stringify(root));
}

export function loadSession(adapter: StorageAdapter): Session | null {
  const raw = adapter.getItem(SESSION_KEY);
  if (!raw) return null;
  const parsed = safeJsonParse<Session>(raw);
  if (!parsed || typeof parsed.userId !== "string" || typeof parsed.businessId !== "string") return null;
  if (!parsed.userId || !parsed.businessId) return null;
  return parsed;
}

export function saveSession(adapter: StorageAdapter, session: Session | null): void {
  if (!session) {
    adapter.removeItem(SESSION_KEY);
    return;
  }
  adapter.setItem(SESSION_KEY, JSON.stringify(session));
}

export function needsSetup(root: WorkspaceRoot): boolean {
  return root.users.length === 0;
}
