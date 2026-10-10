import type { AppData, DashboardRange, Product } from "@/types";
import { inventoryValue } from "@/lib/business";
import { endOfDay, inRange, rangeStart, roundMoney, todayIsoDate } from "@/lib/utils";

export type AnalyticsSnapshot = {
  revenue: number;
  costs: number;
  profit: number;
  outstanding: number;
  paidInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  orders: number;
  completedOrders: number;
  averageOrderValue: number;
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  inventoryValue: number;
  lowStock: number;
  outOfStock: number;
  revenueByDay: { date: string; revenue: number }[];
  bestSellers: { productId: string; name: string; quantity: number; revenue: number }[];
  poorPerformers: { productId: string; name: string; quantity: number; revenue: number }[];
  lifetimeValues: { customerId: string; name: string; value: number }[];
};

function productMap(products: Product[]) {
  return new Map(products.map((p) => [p.id, p]));
}

export function computeAnalytics(data: AppData, range: DashboardRange): AnalyticsSnapshot {
  const from = rangeStart(range);
  const to = endOfDay();
  const inWindow = (iso: string) => inRange(iso, from, to);

  const orders = data.orders.filter((o) => o.status !== "cancelled" && inWindow(o.date));
  const completed = orders.filter((o) => o.status === "completed");
  const revenue = roundMoney(completed.reduce((s, o) => s + o.total, 0));
  const products = productMap(data.products);

  let costs = 0;
  const sold = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const order of completed) {
    for (const item of order.items) {
      const product = item.productId ? products.get(item.productId) : undefined;
      const cost = (product?.purchasePrice ?? 0) * item.quantity;
      costs += cost;
      const key = item.productId ?? item.name;
      const current = sold.get(key) ?? { name: item.name, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.quantity * item.unitPrice;
      sold.set(key, current);
    }
  }
  costs = roundMoney(costs);

  const invoicesInRange = data.invoices.filter((i) => inWindow(i.issueDate));
  const outstanding = roundMoney(
    data.invoices
      .filter((i) => i.paymentStatus !== "paid")
      .reduce((s, i) => s + i.total - data.payments.filter((p) => p.invoiceId === i.id).reduce((a, p) => a + p.amount, 0), 0),
  );

  const newCustomers = data.customers.filter((c) => inWindow(c.createdAt)).length;
  const returningCustomers = data.customers.filter((c) => c.totalSpent > 0 && !inWindow(c.createdAt)).length;

  const days: { date: string; revenue: number }[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const key = todayIsoDate(cursor);
      const dayRev = completed
      .filter((o) => todayIsoDate(new Date(o.date)) === key || o.date.slice(0, 10) === key)
      .reduce((s, o) => s + o.total, 0);
    days.push({ date: key, revenue: roundMoney(dayRev) });
    cursor.setDate(cursor.getDate() + 1);
  }

  const ranked = [...sold.entries()]
    .map(([productId, v]) => ({ productId, ...v, revenue: roundMoney(v.revenue) }))
    .sort((a, b) => b.quantity - a.quantity);

  const neverSold = data.products
    .filter((p) => !sold.has(p.id))
    .map((p) => ({ productId: p.id, name: p.name, quantity: 0, revenue: 0 }));

  return {
    revenue,
    costs,
    profit: roundMoney(revenue - costs),
    outstanding: roundMoney(Math.max(0, outstanding)),
    paidInvoices: invoicesInRange.filter((i) => i.paymentStatus === "paid").length,
    unpaidInvoices: data.invoices.filter((i) => i.paymentStatus === "unpaid" || i.paymentStatus === "partial").length,
    overdueInvoices: data.invoices.filter((i) => i.paymentStatus === "overdue").length,
    orders: orders.length,
    completedOrders: completed.length,
    averageOrderValue: completed.length ? roundMoney(revenue / completed.length) : 0,
    customers: data.customers.length,
    newCustomers,
    returningCustomers,
    inventoryValue: inventoryValue(data.products),
    lowStock: data.products.filter((p) => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
    outOfStock: data.products.filter((p) => p.stock <= 0).length,
    revenueByDay: days.length > 60 ? days.filter((_, i) => i % 3 === 0) : days,
    bestSellers: ranked.slice(0, 5),
    poorPerformers: [...neverSold, ...ranked.slice().reverse()].slice(0, 5),
    lifetimeValues: [...data.customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 8)
      .map((c) => ({ customerId: c.id, name: c.name, value: c.totalSpent })),
  };
}
