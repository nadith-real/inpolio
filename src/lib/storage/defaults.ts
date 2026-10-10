import type { AppData, BusinessSettings } from "@/types";

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "Inpolio",
  logo: "",
  email: "",
  phone: "",
  address: "",
  currency: "LKR",
  taxRate: 0,
  appearance: "system",
};

export const EMPTY_DATA: AppData = {
  customers: [],
  leads: [],
  products: [],
  suppliers: [],
  orders: [],
  invoices: [],
  payments: [],
  appointments: [],
  tasks: [],
  automations: [],
  notifications: [],
  settings: { ...DEFAULT_SETTINGS },
  meta: { demoLoaded: false, version: 1 },
};

export const STORAGE_KEY = "inpolio.data.v1";
