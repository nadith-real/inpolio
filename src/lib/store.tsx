import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AppData, CollectionKey } from "@/types";
import { AppRepository, EMPTY_DATA, LocalStorageAdapter } from "@/lib/storage";
import { applyCustomerSpend, applyInvoiceStatuses, applyInventoryForOrder, mergeDemo, removeDemoRecords } from "@/lib/business";
import { generateSystemNotifications, runAutomations } from "@/lib/automation/engine";
import { buildDemoData } from "@/lib/demo";
import { parseImport } from "@/lib/export";

const repo = new AppRepository(new LocalStorageAdapter());

function persistReady(data: AppData): AppData {
  return generateSystemNotifications(runAutomations(applyCustomerSpend(applyInvoiceStatuses(data))));
}

type StoreContextValue = {
  data: AppData;
  ready: boolean;
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
  importData: (raw: string) => { ok: true } | { ok: false; error: string };
  replaceData: (data: AppData) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    const loaded = persistReady(repo.load());
    repo.save(loaded);
    setData(loaded);
    skipSave.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    repo.save(data);
  }, [data, ready]);

  const commit = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => persistReady(updater(prev)));
  }, []);

  const upsert = useCallback(
    <K extends CollectionKey>(collection: K, record: AppData[K][number]) => {
      commit((prev) => repo.upsert(prev, collection, record));
    },
    [commit],
  );

  const remove = useCallback(
    <K extends CollectionKey>(collection: K, id: string) => {
      commit((prev) => {
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
    [commit],
  );

  const saveOrder = useCallback(
    (order: AppData["orders"][number], previous?: AppData["orders"][number]) => {
      commit((prev) => {
        const { products, order: nextOrder } = applyInventoryForOrder(prev.products, order, previous);
        return repo.upsert({ ...prev, products }, "orders", nextOrder);
      });
    },
    [commit],
  );

  const updateSettings = useCallback((patch: Partial<AppData["settings"]>) => {
    commit((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, [commit]);

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
    commit((prev) => mergeDemo(prev, buildDemoData()));
  }, [commit]);

  const removeDemo = useCallback(() => {
    commit((prev) => removeDemoRecords(prev));
  }, [commit]);

  const clearAll = useCallback(() => {
    skipSave.current = false;
    setData(persistReady({ ...EMPTY_DATA, settings: data.settings }));
  }, [data.settings]);

  const resetAll = useCallback(() => {
    repo.clear();
    skipSave.current = false;
    setData(persistReady(structuredClone(EMPTY_DATA)));
  }, []);

  const importData = useCallback((raw: string) => {
    const result = parseImport(raw);
    if (!result.ok) return result;
    skipSave.current = false;
    setData(persistReady(result.data));
    return { ok: true as const };
  }, []);

  const replaceData = useCallback((next: AppData) => {
    skipSave.current = false;
    setData(persistReady(next));
  }, []);

  const value = useMemo(
    () => ({
      data,
      ready,
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
    }),
    [
      data,
      ready,
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
