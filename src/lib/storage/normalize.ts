import type {
  AppData,
  Appointment,
  AppNotification,
  Automation,
  Customer,
  Invoice,
  Lead,
  LineItem,
  Order,
  Payment,
  Product,
  Supplier,
  Task,
} from "@/types";
import { clampNonNegative, createId, nowIso, roundMoney, toNumber } from "@/lib/utils";
import { DEFAULT_SETTINGS, EMPTY_DATA } from "./defaults";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeItems(value: unknown): LineItem[] {
  return asArray<Record<string, unknown>>(value).map((item) => ({
    productId: asString(item.productId) || undefined,
    name: asString(item.name, "Item"),
    quantity: clampNonNegative(toNumber(item.quantity, 1)),
    unitPrice: clampNonNegative(toNumber(item.unitPrice)),
  }));
}

function ensureId(id: unknown): string {
  const value = asString(id);
  return value || createId();
}

export function normalizeCustomer(raw: Record<string, unknown>): Customer {
  return {
    id: ensureId(raw.id),
    name: asString(raw.name, "Unnamed"),
    company: asString(raw.company),
    email: asString(raw.email),
    phone: asString(raw.phone),
    address: asString(raw.address),
    notes: asString(raw.notes),
    tags: asArray<string>(raw.tags).filter((t) => typeof t === "string"),
    status: ["lead", "prospect", "customer", "inactive"].includes(asString(raw.status))
      ? (raw.status as Customer["status"])
      : "lead",
    createdAt: asString(raw.createdAt, nowIso()),
    lastInteraction: asString(raw.lastInteraction, asString(raw.createdAt, nowIso())),
    totalSpent: clampNonNegative(toNumber(raw.totalSpent)),
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizeLead(raw: Record<string, unknown>): Lead {
  return {
    id: ensureId(raw.id),
    name: asString(raw.name, "Unnamed lead"),
    company: asString(raw.company),
    contact: asString(raw.contact),
    email: asString(raw.email),
    phone: asString(raw.phone),
    potentialValue: clampNonNegative(toNumber(raw.potentialValue)),
    source: asString(raw.source),
    stage: ["new", "contacted", "qualified", "proposal", "won", "lost"].includes(asString(raw.stage))
      ? (raw.stage as Lead["stage"])
      : "new",
    notes: asString(raw.notes),
    nextFollowUp: asString(raw.nextFollowUp),
    createdAt: asString(raw.createdAt, nowIso()),
    customerId: asString(raw.customerId) || undefined,
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizeProduct(raw: Record<string, unknown>): Product {
  return {
    id: ensureId(raw.id),
    name: asString(raw.name, "Unnamed product"),
    sku: asString(raw.sku),
    category: asString(raw.category, "General"),
    description: asString(raw.description),
    purchasePrice: clampNonNegative(toNumber(raw.purchasePrice)),
    sellingPrice: clampNonNegative(toNumber(raw.sellingPrice)),
    stock: toNumber(raw.stock),
    lowStockThreshold: clampNonNegative(toNumber(raw.lowStockThreshold, 5)),
    supplierId: asString(raw.supplierId),
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizeSupplier(raw: Record<string, unknown>): Supplier {
  return {
    id: ensureId(raw.id),
    name: asString(raw.name, "Unnamed supplier"),
    company: asString(raw.company),
    phone: asString(raw.phone),
    email: asString(raw.email),
    address: asString(raw.address),
    notes: asString(raw.notes),
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizeOrder(raw: Record<string, unknown>): Order {
  const items = normalizeItems(raw.items);
  return {
    id: ensureId(raw.id),
    orderNumber: asString(raw.orderNumber, "ORD-0001"),
    customerId: asString(raw.customerId),
    items,
    subtotal: roundMoney(toNumber(raw.subtotal)),
    discount: clampNonNegative(toNumber(raw.discount)),
    tax: clampNonNegative(toNumber(raw.tax)),
    total: roundMoney(toNumber(raw.total)),
    paymentStatus: ["unpaid", "partial", "paid", "overdue"].includes(asString(raw.paymentStatus))
      ? (raw.paymentStatus as Order["paymentStatus"])
      : "unpaid",
    status: ["pending", "confirmed", "processing", "completed", "cancelled"].includes(asString(raw.status))
      ? (raw.status as Order["status"])
      : "pending",
    date: asString(raw.date, nowIso()),
    notes: asString(raw.notes),
    inventoryApplied: asBool(raw.inventoryApplied),
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizeInvoice(raw: Record<string, unknown>): Invoice {
  return {
    id: ensureId(raw.id),
    invoiceNumber: asString(raw.invoiceNumber, "INV-0001"),
    customerId: asString(raw.customerId),
    orderId: asString(raw.orderId) || undefined,
    items: normalizeItems(raw.items),
    subtotal: roundMoney(toNumber(raw.subtotal)),
    discount: clampNonNegative(toNumber(raw.discount)),
    tax: clampNonNegative(toNumber(raw.tax)),
    total: roundMoney(toNumber(raw.total)),
    issueDate: asString(raw.issueDate, nowIso()),
    dueDate: asString(raw.dueDate),
    paymentStatus: ["unpaid", "partial", "paid", "overdue"].includes(asString(raw.paymentStatus))
      ? (raw.paymentStatus as Invoice["paymentStatus"])
      : "unpaid",
    notes: asString(raw.notes),
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizePayment(raw: Record<string, unknown>): Payment {
  return {
    id: ensureId(raw.id),
    customerId: asString(raw.customerId),
    invoiceId: asString(raw.invoiceId),
    amount: clampNonNegative(toNumber(raw.amount)),
    method: ["cash", "bank_transfer", "card", "other"].includes(asString(raw.method))
      ? (raw.method as Payment["method"])
      : "cash",
    date: asString(raw.date, nowIso()),
    reference: asString(raw.reference),
    notes: asString(raw.notes),
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizeAppointment(raw: Record<string, unknown>): Appointment {
  return {
    id: ensureId(raw.id),
    customerId: asString(raw.customerId),
    title: asString(raw.title, "Appointment"),
    date: asString(raw.date),
    startTime: asString(raw.startTime, "09:00"),
    endTime: asString(raw.endTime, "10:00"),
    status: ["scheduled", "confirmed", "completed", "cancelled", "no-show"].includes(asString(raw.status))
      ? (raw.status as Appointment["status"])
      : "scheduled",
    notes: asString(raw.notes),
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizeTask(raw: Record<string, unknown>): Task {
  return {
    id: ensureId(raw.id),
    title: asString(raw.title, "Task"),
    description: asString(raw.description),
    dueDate: asString(raw.dueDate),
    priority: ["low", "medium", "high", "urgent"].includes(asString(raw.priority))
      ? (raw.priority as Task["priority"])
      : "medium",
    status: ["todo", "in_progress", "completed"].includes(asString(raw.status))
      ? (raw.status as Task["status"])
      : "todo",
    customerId: asString(raw.customerId),
    orderId: asString(raw.orderId),
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizeAutomation(raw: Record<string, unknown>): Automation {
  return {
    id: ensureId(raw.id),
    name: asString(raw.name, "Automation"),
    enabled: asBool(raw.enabled, true),
    trigger: asString(raw.trigger, "invoice.overdue") as Automation["trigger"],
    action: ["create_task", "create_notification"].includes(asString(raw.action))
      ? (raw.action as Automation["action"])
      : "create_notification",
    actionTitle: asString(raw.actionTitle, "Follow up"),
    actionBody: asString(raw.actionBody),
    createdAt: asString(raw.createdAt, nowIso()),
    isDemo: asBool(raw.isDemo),
  };
}

export function normalizeNotification(raw: Record<string, unknown>): AppNotification {
  return {
    id: ensureId(raw.id),
    type: asString(raw.type, "automation") as AppNotification["type"],
    title: asString(raw.title, "Notification"),
    message: asString(raw.message),
    read: asBool(raw.read),
    createdAt: asString(raw.createdAt, nowIso()),
    relatedId: asString(raw.relatedId) || undefined,
    relatedType: asString(raw.relatedType) || undefined,
    signature: asString(raw.signature, asString(raw.id)),
  };
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

export function normalizeAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== "object") return structuredClone(EMPTY_DATA);
  const data = raw as Record<string, unknown>;
  const settingsRaw = (data.settings ?? {}) as Record<string, unknown>;
  return {
    customers: uniqueById(asArray<Record<string, unknown>>(data.customers).map(normalizeCustomer)),
    leads: uniqueById(asArray<Record<string, unknown>>(data.leads).map(normalizeLead)),
    products: uniqueById(asArray<Record<string, unknown>>(data.products).map(normalizeProduct)),
    suppliers: uniqueById(asArray<Record<string, unknown>>(data.suppliers).map(normalizeSupplier)),
    orders: uniqueById(asArray<Record<string, unknown>>(data.orders).map(normalizeOrder)),
    invoices: uniqueById(asArray<Record<string, unknown>>(data.invoices).map(normalizeInvoice)),
    payments: uniqueById(asArray<Record<string, unknown>>(data.payments).map(normalizePayment)),
    appointments: uniqueById(asArray<Record<string, unknown>>(data.appointments).map(normalizeAppointment)),
    tasks: uniqueById(asArray<Record<string, unknown>>(data.tasks).map(normalizeTask)),
    automations: uniqueById(asArray<Record<string, unknown>>(data.automations).map(normalizeAutomation)),
    notifications: uniqueById(asArray<Record<string, unknown>>(data.notifications).map(normalizeNotification)),
    settings: {
      businessName: asString(settingsRaw.businessName, DEFAULT_SETTINGS.businessName),
      logo: asString(settingsRaw.logo),
      email: asString(settingsRaw.email),
      phone: asString(settingsRaw.phone),
      address: asString(settingsRaw.address),
      currency: asString(settingsRaw.currency, "LKR") || "LKR",
      taxRate: clampNonNegative(toNumber(settingsRaw.taxRate, 0)),
      appearance: ["light", "dark", "system"].includes(asString(settingsRaw.appearance))
        ? (settingsRaw.appearance as AppData["settings"]["appearance"])
        : "system",
    },
    meta: {
      demoLoaded: asBool((data.meta as Record<string, unknown> | undefined)?.demoLoaded),
      version: toNumber((data.meta as Record<string, unknown> | undefined)?.version, 1) || 1,
    },
  };
}
