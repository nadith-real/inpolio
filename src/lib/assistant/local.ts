import type { AppData } from "@/types";
import { computeAnalytics } from "@/lib/analytics";
import { invoiceStatus, lowStockProducts, outOfStockProducts, paidAmountForInvoice } from "@/lib/business";
import { formatMoney, todayIsoDate } from "@/lib/utils";
import type { AIProvider } from "./provider";

function customerName(data: AppData, id: string) {
  return data.customers.find((c) => c.id === id)?.name ?? "Unknown customer";
}

function normalize(q: string) {
  return q.toLowerCase().trim();
}

export class LocalDataProvider implements AIProvider {
  name = "Local data";

  answer(question: string, data: AppData): string {
    const q = normalize(question);
    const currency = data.settings.currency || "LKR";
    const today = todayIsoDate();

    if (!q) return "Ask a question about stock, invoices, customers, orders or tasks.";

    if (/(low|out).*(stock|inventory)|which products are low/.test(q) || q.includes("low in stock")) {
      const low = lowStockProducts(data.products);
      const out = outOfStockProducts(data.products);
      const lines = [
        out.length ? `Out of stock (${out.length}): ${out.map((p) => p.name).join(", ")}` : "No products are out of stock.",
        low.length ? `Low stock (${low.length}): ${low.map((p) => `${p.name} (${p.stock})`).join(", ")}` : "No products are below threshold.",
      ];
      return lines.join("\n");
    }

    if (/owe|outstanding|unpaid|who owes/.test(q)) {
      const open = data.invoices.filter((i) => invoiceStatus(i, data.payments, today) !== "paid");
      if (!open.length) return "Nobody currently owes money. All invoices are paid.";
      return open
        .map((i) => {
          const due = roundDue(i.total - paidAmountForInvoice(data.payments, i.id));
          return `${i.invoiceNumber} — ${customerName(data, i.customerId)} owes ${formatMoney(due, currency)} (${i.paymentStatus})`;
        })
        .join("\n");
    }

    if (/best.?sell|top product|most sold/.test(q)) {
      const snap = computeAnalytics(data, "year");
      if (!snap.bestSellers.length) return "No completed sales yet, so there are no best sellers.";
      return snap.bestSellers
        .map((p, i) => `${i + 1}. ${p.name} — ${p.quantity} sold, ${formatMoney(p.revenue, currency)}`)
        .join("\n");
    }

    if (/overdue invoice/.test(q) || q.includes("which invoices are overdue")) {
      const overdue = data.invoices.filter((i) => invoiceStatus(i, data.payments, today) === "overdue");
      if (!overdue.length) return "No invoices are overdue.";
      return overdue
        .map(
          (i) =>
            `${i.invoiceNumber} — ${customerName(data, i.customerId)}, due ${i.dueDate}, ${formatMoney(i.total - paidAmountForInvoice(data.payments, i.id), currency)} remaining`,
        )
        .join("\n");
    }

    if (/appointment|today.*meeting|what.*today/.test(q) && /task/.test(q) === false) {
      const apts = data.appointments.filter((a) => a.date === today && !["cancelled", "no-show"].includes(a.status));
      if (!apts.length) return "No appointments scheduled for today.";
      return apts.map((a) => `${a.startTime}–${a.endTime} ${a.title} (${a.status})`).join("\n");
    }

    if (/overdue task|tasks are overdue/.test(q)) {
      const tasks = data.tasks.filter((t) => t.status !== "completed" && t.dueDate && t.dueDate < today);
      if (!tasks.length) return "No overdue tasks.";
      return tasks.map((t) => `${t.title} — due ${t.dueDate} (${t.priority})`).join("\n");
    }

    if (/revenue|sales this|how much/.test(q)) {
      const range = /today/.test(q) ? "today" : /week|7/.test(q) ? "7d" : /year/.test(q) ? "year" : "30d";
      const snap = computeAnalytics(data, range);
      return `Revenue (${range}): ${formatMoney(snap.revenue, currency)}\nProfit: ${formatMoney(snap.profit, currency)}\nOrders: ${snap.completedOrders}\nAverage order: ${formatMoney(snap.averageOrderValue, currency)}`;
    }

    if (/unpaid invoice|show unpaid/.test(q)) {
      const unpaid = data.invoices.filter((i) => i.paymentStatus === "unpaid" || i.paymentStatus === "partial");
      if (!unpaid.length) return "There are no unpaid invoices.";
      return unpaid
        .map((i) => `${i.invoiceNumber} — ${customerName(data, i.customerId)} — ${formatMoney(i.total, currency)} (${i.paymentStatus})`)
        .join("\n");
    }

    if (/how many customer/.test(q)) {
      return `You have ${data.customers.length} customers (${data.customers.filter((c) => c.status === "customer").length} active).`;
    }

    if (/supplier/.test(q)) {
      return data.suppliers.length
        ? data.suppliers.map((s) => `${s.name} (${s.company || "no company"})`).join("\n")
        : "No suppliers stored yet.";
    }

    return [
      "I can answer from your local data only. Try:",
      "• Which products are low in stock?",
      "• Who owes money?",
      "• What are my best-selling products?",
      "• Which invoices are overdue?",
      "• What appointments do I have today?",
    ].join("\n");
  }
}

function roundDue(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export { SUGGESTED_QUERIES } from "./provider";
export const defaultProvider: AIProvider = new LocalDataProvider();
