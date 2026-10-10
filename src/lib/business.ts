import type { AppData, Invoice, Order, Payment, PaymentStatus, Product } from "@/types";
import { roundMoney, todayIsoDate } from "@/lib/utils";

export function paidAmountForInvoice(payments: Payment[], invoiceId: string): number {
  return roundMoney(
    payments.filter((p) => p.invoiceId === invoiceId).reduce((sum, p) => sum + p.amount, 0),
  );
}

export function invoiceStatus(invoice: Invoice, payments: Payment[], today = todayIsoDate()): PaymentStatus {
  const paid = paidAmountForInvoice(payments, invoice.id);
  if (paid >= invoice.total - 0.009) return "paid";
  if (paid > 0 && invoice.dueDate && invoice.dueDate < today) return "overdue";
  if (paid > 0) return "partial";
  if (invoice.dueDate && invoice.dueDate < today) return "overdue";
  return "unpaid";
}

export function applyInvoiceStatuses(data: AppData): AppData {
  const invoices = data.invoices.map((invoice) => ({
    ...invoice,
    paymentStatus: invoiceStatus(invoice, data.payments),
  }));
  return { ...data, invoices };
}

export function applyCustomerSpend(data: AppData): AppData {
  const spent = new Map<string, number>();
  for (const payment of data.payments) {
    spent.set(payment.customerId, roundMoney((spent.get(payment.customerId) ?? 0) + payment.amount));
  }
  const customers = data.customers.map((c) => ({
    ...c,
    totalSpent: spent.get(c.id) ?? 0,
  }));
  return { ...data, customers };
}

export function applyInventoryForOrder(
  products: Product[],
  order: Order,
  previous?: Order,
): { products: Product[]; order: Order } {
  let nextProducts = products.map((p) => ({ ...p }));
  let nextOrder = { ...order };

  const restore = (target: Order) => {
    if (!target.inventoryApplied) return;
    for (const item of target.items) {
      if (!item.productId) continue;
      const product = nextProducts.find((p) => p.id === item.productId);
      if (product) product.stock += item.quantity;
    }
  };

  const deduct = (target: Order) => {
    for (const item of target.items) {
      if (!item.productId) continue;
      const product = nextProducts.find((p) => p.id === item.productId);
      if (product) product.stock -= item.quantity;
    }
  };

  if (previous?.inventoryApplied) restore(previous);

  if (nextOrder.status === "completed") {
    deduct(nextOrder);
    nextOrder.inventoryApplied = true;
  } else {
    nextOrder.inventoryApplied = false;
  }

  return { products: nextProducts, order: nextOrder };
}

export function removeDemoRecords(data: AppData): AppData {
  const strip = <T extends { isDemo?: boolean }>(items: T[]) => items.filter((item) => !item.isDemo);
  return {
    ...data,
    customers: strip(data.customers),
    leads: strip(data.leads),
    products: strip(data.products),
    suppliers: strip(data.suppliers),
    orders: strip(data.orders),
    invoices: strip(data.invoices),
    payments: strip(data.payments),
    appointments: strip(data.appointments),
    tasks: strip(data.tasks),
    automations: strip(data.automations),
    notifications: data.notifications,
    meta: { ...data.meta, demoLoaded: false },
  };
}

export function mergeDemo(data: AppData, demo: AppData): AppData {
  const without = removeDemoRecords(data);
  return {
    ...without,
    customers: [...demo.customers, ...without.customers],
    leads: [...demo.leads, ...without.leads],
    products: [...demo.products, ...without.products],
    suppliers: [...demo.suppliers, ...without.suppliers],
    orders: [...demo.orders, ...without.orders],
    invoices: [...demo.invoices, ...without.invoices],
    payments: [...demo.payments, ...without.payments],
    appointments: [...demo.appointments, ...without.appointments],
    tasks: [...demo.tasks, ...without.tasks],
    automations: [...demo.automations, ...without.automations],
    settings: data.settings.businessName === "Inpolio" ? demo.settings : data.settings,
    meta: { ...without.meta, demoLoaded: true },
  };
}

export function inventoryValue(products: Product[]): number {
  return roundMoney(products.reduce((sum, p) => sum + p.stock * p.purchasePrice, 0));
}

export function lowStockProducts(products: Product[]): Product[] {
  return products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold);
}

export function outOfStockProducts(products: Product[]): Product[] {
  return products.filter((p) => p.stock <= 0);
}
