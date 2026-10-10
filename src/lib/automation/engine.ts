import type { AppData, AppNotification, Automation, Task } from "@/types";
import { createId, nowIso, todayIsoDate } from "@/lib/utils";
import { invoiceStatus, lowStockProducts } from "@/lib/business";

function hasTask(data: AppData, signature: string): boolean {
  return data.tasks.some((t) => t.description.includes(`[auto:${signature}]`));
}

function hasNotification(data: AppData, signature: string): boolean {
  return data.notifications.some((n) => n.signature === signature);
}

function notify(
  type: AppNotification["type"],
  title: string,
  message: string,
  signature: string,
  relatedId?: string,
  relatedType?: string,
): AppNotification {
  return {
    id: createId(),
    type,
    title,
    message,
    read: false,
    createdAt: nowIso(),
    relatedId,
    relatedType,
    signature,
  };
}

function taskFrom(auto: Automation, signature: string, extra: Partial<Task> = {}): Task {
  return {
    id: createId(),
    title: auto.actionTitle,
    description: `${auto.actionBody}\n[auto:${signature}]`,
    dueDate: todayIsoDate(),
    priority: "high",
    status: "todo",
    customerId: extra.customerId ?? "",
    orderId: extra.orderId ?? "",
  };
}

function applyAction(
  data: AppData,
  auto: Automation,
  signature: string,
  notificationType: AppNotification["type"],
  message: string,
  extra: { relatedId?: string; relatedType?: string; customerId?: string; orderId?: string } = {},
): AppData {
  if (auto.action === "create_task") {
    if (hasTask(data, signature)) return data;
    return { ...data, tasks: [taskFrom(auto, signature, extra), ...data.tasks] };
  }
  if (hasNotification(data, signature)) return data;
  return {
    ...data,
    notifications: [
      notify(notificationType, auto.actionTitle, message, signature, extra.relatedId, extra.relatedType),
      ...data.notifications,
    ],
  };
}

export function runAutomations(data: AppData): AppData {
  let next = data;
  const today = todayIsoDate();
  const enabled = data.automations.filter((a) => a.enabled);

  for (const auto of enabled) {
    if (auto.trigger === "invoice.overdue") {
      for (const invoice of data.invoices) {
        if (invoiceStatus(invoice, data.payments, today) !== "overdue") continue;
        const signature = `invoice.overdue:${invoice.id}`;
        next = applyAction(next, auto, signature, "overdue_invoice", `${invoice.invoiceNumber} is overdue.`, {
          relatedId: invoice.id,
          relatedType: "invoice",
          customerId: invoice.customerId,
        });
      }
    }

    if (auto.trigger === "stock.below_threshold") {
      for (const product of lowStockProducts(data.products).concat(
        data.products.filter((p) => p.stock <= 0),
      )) {
        const signature = `stock:${product.id}:${product.stock}`;
        next = applyAction(
          next,
          auto,
          signature,
          "low_stock",
          `${product.name} stock is ${product.stock} (threshold ${product.lowStockThreshold}).`,
          { relatedId: product.id, relatedType: "product" },
        );
      }
    }

    if (auto.trigger === "order.completed") {
      for (const order of data.orders.filter((o) => o.status === "completed")) {
        const signature = `order.completed:${order.id}`;
        next = applyAction(next, auto, signature, "new_order", `${order.orderNumber} was completed.`, {
          relatedId: order.id,
          relatedType: "order",
          customerId: order.customerId,
          orderId: order.id,
        });
      }
    }

    if (auto.trigger === "invoice.created") {
      for (const invoice of data.invoices) {
        const signature = `invoice.created:${invoice.id}`;
        next = applyAction(next, auto, signature, "automation", `${invoice.invoiceNumber} was created.`, {
          relatedId: invoice.id,
          relatedType: "invoice",
          customerId: invoice.customerId,
        });
      }
    }

    if (auto.trigger === "payment.received") {
      for (const payment of data.payments) {
        const signature = `payment.received:${payment.id}`;
        next = applyAction(
          next,
          auto,
          signature,
          "automation",
          `Payment of ${payment.amount} was recorded.`,
          { relatedId: payment.id, relatedType: "payment", customerId: payment.customerId },
        );
      }
    }

    if (auto.trigger === "task.overdue") {
      for (const task of data.tasks) {
        if (task.status === "completed" || !task.dueDate || task.dueDate >= today) continue;
        const signature = `task.overdue:${task.id}`;
        next = applyAction(next, auto, signature, "overdue_task", `"${task.title}" is overdue.`, {
          relatedId: task.id,
          relatedType: "task",
          customerId: task.customerId,
        });
      }
    }

    if (auto.trigger === "appointment.upcoming") {
      for (const apt of data.appointments) {
        if (apt.status === "cancelled" || apt.status === "completed" || apt.status === "no-show") continue;
        if (apt.date !== today && apt.date !== (() => {
          const t = new Date();
          t.setDate(t.getDate() + 1);
          return todayIsoDate(t);
        })()) continue;
        const signature = `appointment.upcoming:${apt.id}:${apt.date}`;
        next = applyAction(next, auto, signature, "upcoming_appointment", `${apt.title} is coming up.`, {
          relatedId: apt.id,
          relatedType: "appointment",
          customerId: apt.customerId,
        });
      }
    }
  }

  return next;
}

export function generateSystemNotifications(data: AppData): AppData {
  const today = todayIsoDate();
  const extra: AppNotification[] = [];
  const existing = new Set(data.notifications.map((n) => n.signature));

  const push = (n: AppNotification) => {
    if (!existing.has(n.signature)) extra.push(n);
  };

  for (const invoice of data.invoices) {
    if (invoiceStatus(invoice, data.payments, today) === "overdue") {
      push(
        notify(
          "overdue_invoice",
          "Overdue invoice",
          `${invoice.invoiceNumber} is overdue.`,
          `sys:overdue:${invoice.id}`,
          invoice.id,
          "invoice",
        ),
      );
    }
  }

  for (const product of data.products) {
    if (product.stock <= 0) {
      push(
        notify(
          "low_stock",
          "Out of stock",
          `${product.name} is out of stock.`,
          `sys:oos:${product.id}`,
          product.id,
          "product",
        ),
      );
    } else if (product.stock <= product.lowStockThreshold) {
      push(
        notify(
          "low_stock",
          "Low stock",
          `${product.name} has ${product.stock} left.`,
          `sys:low:${product.id}`,
          product.id,
          "product",
        ),
      );
    }
  }

  for (const task of data.tasks) {
    if (task.status !== "completed" && task.dueDate && task.dueDate < today) {
      push(
        notify(
          "overdue_task",
          "Overdue task",
          `"${task.title}" is overdue.`,
          `sys:task:${task.id}`,
          task.id,
          "task",
        ),
      );
    }
  }

  for (const apt of data.appointments) {
    if (["cancelled", "completed", "no-show"].includes(apt.status)) continue;
    if (apt.date === today) {
      push(
        notify(
          "upcoming_appointment",
          "Appointment today",
          `${apt.title} is scheduled today at ${apt.startTime}.`,
          `sys:apt:${apt.id}:${apt.date}`,
          apt.id,
          "appointment",
        ),
      );
    }
  }

  if (extra.length === 0) return data;
  return { ...data, notifications: [...extra, ...data.notifications] };
}
