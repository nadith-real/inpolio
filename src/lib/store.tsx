import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppData, Business, CollectionKey, Permission, Role, Session, User, WorkspaceRoot } from "@/types";
import {
  EMPTY_DATA,
  DEFAULT_SETTINGS,
  LocalStorageAdapter,
  AppRepository,
  loadWorkspace,
  saveWorkspace,
  loadSession,
  saveSession,
  needsSetup,
  emptyWorkspace,
} from "@/lib/storage";
import { applyCustomerSpend, applyInvoiceStatuses, applyInventoryForOrder, mergeDemo, removeDemoRecords } from "@/lib/business";
import { generateSystemNotifications, runAutomations } from "@/lib/automation/engine";
import { buildDemoData } from "@/lib/demo";
import { parseImport } from "@/lib/export";
import { hashPassword, isValidPassword, isValidUsername, normalizeUsername, verifyPassword } from "@/lib/auth/password";
import {
  accessibleBusinessIds,
  DEFAULT_ROLES,
  hasPermission,
  isOwnerRole,
  OWNER_ROLE_ID,
  ownerCount,
} from "@/lib/auth/permissions";
import { createId, nowIso } from "@/lib/utils";

const adapter = new LocalStorageAdapter();
const repo = new AppRepository(adapter);

function persistReady(data: AppData): AppData {
  return generateSystemNotifications(runAutomations(applyCustomerSpend(applyInvoiceStatuses(data))));
}

function prepareRoot(root: WorkspaceRoot): WorkspaceRoot {
  const workspaces: WorkspaceRoot["workspaces"] = {};
  for (const biz of root.businesses) {
    workspaces[biz.id] = persistReady(root.workspaces[biz.id] ?? structuredClone(EMPTY_DATA));
  }
  return { ...root, workspaces };
}

type AuthResult = { ok: true } | { ok: false; error: string };

type StoreContextValue = {
  data: AppData;
  root: WorkspaceRoot;
  ready: boolean;
  setupNeeded: boolean;
  session: Session | null;
  user: User | null;
  currentBusiness: Business | null;
  accessibleBusinesses: Business[];
  can: (permission: Permission) => boolean;
  completeSetup: (input: { username: string; displayName: string; password: string; businessName: string }) => Promise<AuthResult>;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  switchBusiness: (businessId: string) => void;
  upsert: <K extends CollectionKey>(collection: K, record: AppData[K][number]) => void;
  remove: <K extends CollectionKey>(collection: K, id: string) => void;
  saveOrder: (order: AppData["orders"][number], previous?: AppData["orders"][number]) => void;
  updateSettings: (patch: Partial<AppData["settings"]>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  loadDemo: () => void;
  removeDemo: () => void;
  clearAll: () => void;
  resetAll: () => void;
  importData: (raw: string) => { ok: true; kind: "data" | "workspace" } | { ok: false; error: string };
  replaceData: (data: AppData) => void;
  createBusiness: (name: string) => AuthResult & { id?: string };
  updateBusiness: (id: string, name: string) => AuthResult;
  deleteBusiness: (id: string) => AuthResult;
  createUser: (input: { username: string; displayName: string; password: string; roleId: string; businessIds: string[]; active?: boolean }) => Promise<AuthResult>;
  updateUser: (id: string, patch: { displayName?: string; roleId?: string; businessIds?: string[]; active?: boolean }) => AuthResult;
  setUserPassword: (id: string, password: string) => Promise<AuthResult>;
  deleteUser: (id: string) => AuthResult;
  createRole: (input: { name: string; description: string; permissions: Permission[] }) => AuthResult;
  updateRole: (id: string, patch: { name?: string; description?: string; permissions?: Permission[] }) => AuthResult;
  deleteRole: (id: string) => AuthResult;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<WorkspaceRoot>(emptyWorkspace);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const skipSave = useRef(true);
  const rootRef = useRef(root);
  const sessionRef = useRef(session);
  rootRef.current = root;
  sessionRef.current = session;

  useEffect(() => {
    const loaded = prepareRoot(loadWorkspace(adapter));
    saveWorkspace(adapter, loaded);
    setRoot(loaded);
    const saved = loadSession(adapter);
    if (saved) {
      const user = loaded.users.find((u) => u.id === saved.userId);
      const ids = accessibleBusinessIds(loaded, user);
      if (user?.active && ids.includes(saved.businessId)) {
        setSession(saved);
      } else {
        saveSession(adapter, null);
        setSession(null);
      }
    }
    skipSave.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    saveWorkspace(adapter, root);
  }, [root, ready]);

  useEffect(() => {
    if (!ready) return;
    saveSession(adapter, session);
  }, [session, ready]);

  const currentUser = useCallback((): User | null => {
    const s = sessionRef.current;
    if (!s) return null;
    return rootRef.current.users.find((u) => u.id === s.userId) ?? null;
  }, []);

  const canNow = useCallback((permission: Permission) => hasPermission(rootRef.current, currentUser(), permission), [currentUser]);

  const commit = useCallback((updater: (prev: AppData) => AppData) => {
    const s = sessionRef.current;
    if (!s) return;
    setRoot((prev) => {
      const current = prev.workspaces[s.businessId] ?? structuredClone(EMPTY_DATA);
      return {
        ...prev,
        workspaces: {
          ...prev.workspaces,
          [s.businessId]: persistReady(updater(current)),
        },
      };
    });
  }, []);

  const writeCommit = useCallback((updater: (prev: AppData) => AppData) => {
    if (!canNow("write")) return;
    commit(updater);
  }, [canNow, commit]);

  const upsert = useCallback(
    <K extends CollectionKey>(collection: K, record: AppData[K][number]) => {
      writeCommit((prev) => repo.upsert(prev, collection, record));
    },
    [writeCommit],
  );

  const remove = useCallback(
    <K extends CollectionKey>(collection: K, id: string) => {
      writeCommit((prev) => {
        if (collection === "orders") {
          const order = prev.orders.find((o) => o.id === id);
          if (order?.inventoryApplied) {
            const { products } = applyInventoryForOrder(prev.products, { ...order, status: "cancelled" }, order);
            return repo.remove({ ...prev, products }, collection, id);
          }
        }
        return repo.remove(prev, collection, id);
      });
    },
    [writeCommit],
  );

  const saveOrder = useCallback(
    (order: AppData["orders"][number], previous?: AppData["orders"][number]) => {
      writeCommit((prev) => {
        const { products, order: nextOrder } = applyInventoryForOrder(prev.products, order, previous);
        return repo.upsert({ ...prev, products }, "orders", nextOrder);
      });
    },
    [writeCommit],
  );

  const updateSettings = useCallback((patch: Partial<AppData["settings"]>) => {
    if (!canNow("settings")) return;
    const s = sessionRef.current;
    if (!s) return;
    setRoot((prev) => {
      const current = prev.workspaces[s.businessId] ?? structuredClone(EMPTY_DATA);
      const nextData = persistReady({ ...current, settings: { ...current.settings, ...patch } });
      const businesses =
        patch.businessName !== undefined
          ? prev.businesses.map((b) => (b.id === s.businessId ? { ...b, name: patch.businessName!.trim() || b.name } : b))
          : prev.businesses;
      return {
        ...prev,
        businesses,
        workspaces: { ...prev.workspaces, [s.businessId]: nextData },
      };
    });
  }, [canNow]);

  const markNotificationRead = useCallback((id: string) => {
    commit((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, [commit]);

  const markAllNotificationsRead = useCallback(() => {
    commit((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, [commit]);

  const loadDemo = useCallback(() => {
    writeCommit((prev) => mergeDemo(prev, buildDemoData()));
  }, [writeCommit]);

  const removeDemo = useCallback(() => {
    writeCommit((prev) => removeDemoRecords(prev));
  }, [writeCommit]);

  const clearAll = useCallback(() => {
    if (!canNow("write")) return;
    const s = sessionRef.current;
    if (!s) return;
    setRoot((prev) => {
      const current = prev.workspaces[s.businessId] ?? structuredClone(EMPTY_DATA);
      return {
        ...prev,
        workspaces: {
          ...prev.workspaces,
          [s.businessId]: persistReady({ ...EMPTY_DATA, settings: current.settings }),
        },
      };
    });
  }, [canNow]);

  const resetAll = useCallback(() => {
    if (!canNow("write") && !canNow("settings")) return;
    const s = sessionRef.current;
    if (!s) return;
    setRoot((prev) => ({
      ...prev,
      workspaces: {
        ...prev.workspaces,
        [s.businessId]: persistReady(structuredClone(EMPTY_DATA)),
      },
    }));
  }, [canNow]);

  const importData = useCallback((raw: string): { ok: true; kind: "data" | "workspace" } | { ok: false; error: string } => {
    if (!canNow("export")) return { ok: false, error: "You do not have permission to import data." };
    const result = parseImport(raw);
    if (!result.ok) return result;
    if (result.kind === "workspace") {
      if (!canNow("admin")) return { ok: false, error: "Only admins can import all businesses." };
      const next = prepareRoot(result.workspace);
      const s = sessionRef.current;
      const user = s ? next.users.find((u) => u.id === s.userId) : null;
      const ids = accessibleBusinessIds(next, user);
      skipSave.current = false;
      setRoot(next);
      if (!user?.active || !s || !ids.includes(s.businessId)) {
        const fallback = ids[0];
        if (user?.active && s && fallback) setSession({ userId: s.userId, businessId: fallback });
        else setSession(null);
      }
      return { ok: true, kind: "workspace" };
    }
    const s = sessionRef.current;
    if (!s) return { ok: false, error: "Sign in before importing." };
    setRoot((prev) => ({
      ...prev,
      workspaces: {
        ...prev.workspaces,
        [s.businessId]: persistReady(result.data),
      },
    }));
    return { ok: true, kind: "data" };
  }, [canNow]);

  const replaceData = useCallback((next: AppData) => {
    writeCommit(() => next);
  }, [writeCommit]);

  const completeSetup = useCallback(async (input: { username: string; displayName: string; password: string; businessName: string }): Promise<AuthResult> => {
    if (!needsSetup(rootRef.current)) return { ok: false, error: "Setup is already complete." };
    const username = normalizeUsername(input.username);
    if (!isValidUsername(username)) return { ok: false, error: "Username must be 3–32 characters (letters, numbers, . _ -)." };
    if (!isValidPassword(input.password)) return { ok: false, error: "Password must be at least 6 characters." };
    const businessName = input.businessName.trim() || "My business";
    const passwordHash = await hashPassword(input.password);
    const now = nowIso();
    const userId = createId();
    const existingBizId = rootRef.current.businesses[0]?.id;
    const businessId = existingBizId || createId();
    setRoot((prev) => {
      const businesses = prev.businesses.length
        ? prev.businesses.map((b, i) => (i === 0 ? { ...b, name: businessName } : b))
        : [{ id: businessId, name: businessName, createdAt: now }];
      const user: User = {
        id: userId,
        username,
        displayName: input.displayName.trim() || username,
        passwordHash,
        roleId: OWNER_ROLE_ID,
        businessIds: businesses.map((b) => b.id),
        active: true,
        createdAt: now,
        lastLoginAt: now,
      };
      const workspaces = { ...prev.workspaces };
      for (const biz of businesses) {
        if (!workspaces[biz.id]) workspaces[biz.id] = persistReady(structuredClone(EMPTY_DATA));
        else {
          const data = workspaces[biz.id];
          workspaces[biz.id] = persistReady({
            ...data,
            settings: { ...data.settings, businessName: biz.name },
          });
        }
      }
      return {
        ...prev,
        businesses,
        users: [user],
        roles: prev.roles.length ? prev.roles : DEFAULT_ROLES.map((r) => ({ ...r, permissions: [...r.permissions] })),
        workspaces,
      };
    });
    setSession({ userId, businessId });
    return { ok: true };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    const current = rootRef.current;
    const user = current.users.find((u) => u.username === normalizeUsername(username));
    if (!user || !user.active) return { ok: false, error: "Invalid username or password." };
    const match = await verifyPassword(password, user.passwordHash);
    if (!match) return { ok: false, error: "Invalid username or password." };
    const ids = accessibleBusinessIds(current, user);
    if (!ids.length) return { ok: false, error: "No business is assigned to this account." };
    const preferred = sessionRef.current?.businessId;
    const businessId = preferred && ids.includes(preferred) ? preferred : ids[0];
    const lastLoginAt = nowIso();
    setRoot((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === user.id ? { ...u, lastLoginAt } : u)),
    }));
    setSession({ userId: user.id, businessId });
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const switchBusiness = useCallback((businessId: string) => {
    const user = currentUser();
    const ids = accessibleBusinessIds(rootRef.current, user);
    if (!user || !ids.includes(businessId)) return;
    setSession({ userId: user.id, businessId });
  }, [currentUser]);

  const createBusiness = useCallback((name: string): AuthResult & { id?: string } => {
    if (!canNow("admin")) return { ok: false, error: "You do not have permission to manage businesses." };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Business name is required." };
    const id = createId();
    const now = nowIso();
    setRoot((prev) => ({
      ...prev,
      businesses: [...prev.businesses, { id, name: trimmed, createdAt: now }],
      workspaces: {
        ...prev.workspaces,
        [id]: persistReady({
          ...structuredClone(EMPTY_DATA),
          settings: { ...DEFAULT_SETTINGS, businessName: trimmed },
        }),
      },
    }));
    return { ok: true, id };
  }, [canNow]);

  const updateBusiness = useCallback((id: string, name: string): AuthResult => {
    if (!canNow("admin")) return { ok: false, error: "You do not have permission to manage businesses." };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Business name is required." };
    if (!rootRef.current.businesses.some((b) => b.id === id)) return { ok: false, error: "Business not found." };
    setRoot((prev) => {
      const workspaces = { ...prev.workspaces };
      const data = workspaces[id];
      if (data) {
        workspaces[id] = { ...data, settings: { ...data.settings, businessName: trimmed } };
      }
      return {
        ...prev,
        businesses: prev.businesses.map((b) => (b.id === id ? { ...b, name: trimmed } : b)),
        workspaces,
      };
    });
    return { ok: true };
  }, [canNow]);

  const deleteBusiness = useCallback((id: string): AuthResult => {
    if (!canNow("admin")) return { ok: false, error: "You do not have permission to manage businesses." };
    const current = rootRef.current;
    if (current.businesses.length <= 1) return { ok: false, error: "Cannot delete the last business." };
    if (!current.businesses.some((b) => b.id === id)) return { ok: false, error: "Business not found." };
    const remaining = current.businesses.filter((b) => b.id !== id);
    setRoot((prev) => {
      const workspaces = { ...prev.workspaces };
      delete workspaces[id];
      return {
        ...prev,
        businesses: prev.businesses.filter((b) => b.id !== id),
        users: prev.users.map((u) => ({ ...u, businessIds: u.businessIds.filter((bid) => bid !== id) })),
        workspaces,
      };
    });
    const s = sessionRef.current;
    if (s?.businessId === id) {
      const user = current.users.find((u) => u.id === s.userId);
      const nextIds = remaining.map((b) => b.id);
      const allowed = user && isOwnerRole(user.roleId) ? nextIds : nextIds.filter((bid) => user?.businessIds.includes(bid));
      if (allowed[0]) setSession({ userId: s.userId, businessId: allowed[0] });
      else setSession(null);
    }
    return { ok: true };
  }, [canNow]);

  const createUser = useCallback(async (input: { username: string; displayName: string; password: string; roleId: string; businessIds: string[]; active?: boolean }): Promise<AuthResult> => {
    if (!canNow("admin")) return { ok: false, error: "You do not have permission to manage users." };
    const username = normalizeUsername(input.username);
    if (!isValidUsername(username)) return { ok: false, error: "Username must be 3–32 characters (letters, numbers, . _ -)." };
    if (!isValidPassword(input.password)) return { ok: false, error: "Password must be at least 6 characters." };
    if (rootRef.current.users.some((u) => u.username === username)) return { ok: false, error: "That username is already taken." };
    if (!rootRef.current.roles.some((r) => r.id === input.roleId)) return { ok: false, error: "Select a valid role." };
    const passwordHash = await hashPassword(input.password);
    const user: User = {
      id: createId(),
      username,
      displayName: input.displayName.trim() || username,
      passwordHash,
      roleId: input.roleId,
      businessIds: input.businessIds.filter((id) => rootRef.current.businesses.some((b) => b.id === id)),
      active: input.active ?? true,
      createdAt: nowIso(),
    };
    setRoot((prev) => ({ ...prev, users: [...prev.users, user] }));
    return { ok: true };
  }, [canNow]);

  const updateUser = useCallback((id: string, patch: { displayName?: string; roleId?: string; businessIds?: string[]; active?: boolean }): AuthResult => {
    if (!canNow("admin")) return { ok: false, error: "You do not have permission to manage users." };
    const current = rootRef.current;
    const target = current.users.find((u) => u.id === id);
    if (!target) return { ok: false, error: "User not found." };
    const nextRole = patch.roleId ?? target.roleId;
    if (patch.roleId && !current.roles.some((r) => r.id === patch.roleId)) return { ok: false, error: "Select a valid role." };
    if (isOwnerRole(target.roleId) && (!isOwnerRole(nextRole) || patch.active === false) && ownerCount(current) <= 1) {
      return { ok: false, error: "Cannot remove the last owner." };
    }
    if (patch.active === false && sessionRef.current?.userId === id) {
      return { ok: false, error: "You cannot deactivate your own account." };
    }
    setRoot((prev) => ({
      ...prev,
      users: prev.users.map((u) => {
        if (u.id !== id) return u;
        return {
          ...u,
          displayName: patch.displayName !== undefined ? patch.displayName.trim() || u.displayName : u.displayName,
          roleId: nextRole,
          businessIds: patch.businessIds
            ? patch.businessIds.filter((bid) => prev.businesses.some((b) => b.id === bid))
            : u.businessIds,
          active: patch.active ?? u.active,
        };
      }),
    }));
    return { ok: true };
  }, [canNow]);

  const setUserPassword = useCallback(async (id: string, password: string): Promise<AuthResult> => {
    if (!canNow("admin") && sessionRef.current?.userId !== id) {
      return { ok: false, error: "You do not have permission to change this password." };
    }
    if (!isValidPassword(password)) return { ok: false, error: "Password must be at least 6 characters." };
    if (!rootRef.current.users.some((u) => u.id === id)) return { ok: false, error: "User not found." };
    const passwordHash = await hashPassword(password);
    setRoot((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, passwordHash } : u)),
    }));
    return { ok: true };
  }, [canNow]);

  const deleteUser = useCallback((id: string): AuthResult => {
    if (!canNow("admin")) return { ok: false, error: "You do not have permission to manage users." };
    const current = rootRef.current;
    const target = current.users.find((u) => u.id === id);
    if (!target) return { ok: false, error: "User not found." };
    if (sessionRef.current?.userId === id) return { ok: false, error: "You cannot delete your own account." };
    if (isOwnerRole(target.roleId) && ownerCount(current) <= 1) return { ok: false, error: "Cannot delete the last owner." };
    setRoot((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== id) }));
    return { ok: true };
  }, [canNow]);

  const createRole = useCallback((input: { name: string; description: string; permissions: Permission[] }): AuthResult => {
    if (!canNow("admin")) return { ok: false, error: "You do not have permission to manage roles." };
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Role name is required." };
    const role: Role = {
      id: createId(),
      name,
      description: input.description.trim(),
      permissions: input.permissions,
      isSystem: false,
    };
    setRoot((prev) => ({ ...prev, roles: [...prev.roles, role] }));
    return { ok: true };
  }, [canNow]);

  const updateRole = useCallback((id: string, patch: { name?: string; description?: string; permissions?: Permission[] }): AuthResult => {
    if (!canNow("admin")) return { ok: false, error: "You do not have permission to manage roles." };
    const target = rootRef.current.roles.find((r) => r.id === id);
    if (!target) return { ok: false, error: "Role not found." };
    if (id === OWNER_ROLE_ID) return { ok: false, error: "The owner role cannot be changed." };
    setRoot((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          name: r.isSystem ? r.name : (patch.name?.trim() || r.name),
          description: patch.description !== undefined ? patch.description.trim() : r.description,
          permissions: patch.permissions ?? r.permissions,
        };
      }),
    }));
    return { ok: true };
  }, [canNow]);

  const deleteRole = useCallback((id: string): AuthResult => {
    if (!canNow("admin")) return { ok: false, error: "You do not have permission to manage roles." };
    const target = rootRef.current.roles.find((r) => r.id === id);
    if (!target) return { ok: false, error: "Role not found." };
    if (target.isSystem) return { ok: false, error: "System roles cannot be deleted." };
    if (rootRef.current.users.some((u) => u.roleId === id)) return { ok: false, error: "Reassign users before deleting this role." };
    setRoot((prev) => ({ ...prev, roles: prev.roles.filter((r) => r.id !== id) }));
    return { ok: true };
  }, [canNow]);

  const user = session ? root.users.find((u) => u.id === session.userId) ?? null : null;
  const currentBusiness = session ? root.businesses.find((b) => b.id === session.businessId) ?? null : null;
  const data = session ? root.workspaces[session.businessId] ?? EMPTY_DATA : EMPTY_DATA;
  const accessible = user ? accessibleBusinessIds(root, user) : [];
  const accessibleBusinesses = root.businesses.filter((b) => accessible.includes(b.id));
  const setupNeeded = needsSetup(root);
  const can = useCallback((permission: Permission) => hasPermission(root, user, permission), [root, user]);

  const value = useMemo(
    () => ({
      data,
      root,
      ready,
      setupNeeded,
      session,
      user,
      currentBusiness,
      accessibleBusinesses,
      can,
      completeSetup,
      login,
      logout,
      switchBusiness,
      upsert,
      remove,
      saveOrder,
      updateSettings,
      markNotificationRead,
      markAllNotificationsRead,
      loadDemo,
      removeDemo,
      clearAll,
      resetAll,
      importData,
      replaceData,
      createBusiness,
      updateBusiness,
      deleteBusiness,
      createUser,
      updateUser,
      setUserPassword,
      deleteUser,
      createRole,
      updateRole,
      deleteRole,
    }),
    [
      data,
      root,
      ready,
      setupNeeded,
      session,
      user,
      currentBusiness,
      accessibleBusinesses,
      can,
      completeSetup,
      login,
      logout,
      switchBusiness,
      upsert,
      remove,
      saveOrder,
      updateSettings,
      markNotificationRead,
      markAllNotificationsRead,
      loadDemo,
      removeDemo,
      clearAll,
      resetAll,
      importData,
      replaceData,
      createBusiness,
      updateBusiness,
      deleteBusiness,
      createUser,
      updateUser,
      setUserPassword,
      deleteUser,
      createRole,
      updateRole,
      deleteRole,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useCollection<K extends CollectionKey>(collection: K) {
  const { data } = useStore();
  return data[collection];
}

export function useCanWrite() {
  const { can } = useStore();
  return can("write");
}
