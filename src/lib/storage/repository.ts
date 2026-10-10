import type { AppData, CollectionKey } from "@/types";
import { safeJsonParse } from "@/lib/utils";
import type { StorageAdapter } from "./adapter";
import { EMPTY_DATA, STORAGE_KEY } from "./defaults";
import { normalizeAppData } from "./normalize";

type Identified = { id: string };

export class AppRepository {
  private adapter: StorageAdapter;
  private key: string;

  constructor(adapter: StorageAdapter, key = STORAGE_KEY) {
    this.adapter = adapter;
    this.key = key;
  }

  load(): AppData {
    const raw = this.adapter.getItem(this.key);
    if (!raw) return structuredClone(EMPTY_DATA);
    const parsed = safeJsonParse<unknown>(raw);
    if (!parsed) return structuredClone(EMPTY_DATA);
    return normalizeAppData(parsed);
  }

  save(data: AppData): void {
    this.adapter.setItem(this.key, JSON.stringify(data));
  }

  clear(): void {
    this.adapter.removeItem(this.key);
  }

  list<K extends CollectionKey>(data: AppData, collection: K): AppData[K] {
    return data[collection];
  }

  getById<K extends CollectionKey>(data: AppData, collection: K, id: string) {
    return (data[collection] as Identified[]).find((item) => item.id === id);
  }

  upsert<K extends CollectionKey>(data: AppData, collection: K, record: Identified): AppData {
    const list = [...(data[collection] as Identified[])];
    const index = list.findIndex((item) => item.id === record.id);
    if (index >= 0) list[index] = record;
    else list.unshift(record);
    return { ...data, [collection]: list };
  }

  remove<K extends CollectionKey>(data: AppData, collection: K, id: string): AppData {
    const list = (data[collection] as Identified[]).filter((item) => item.id !== id);
    return { ...data, [collection]: list };
  }
}
