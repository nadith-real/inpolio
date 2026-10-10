function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function paidAmountForInvoice(payments, invoiceId) {
  return roundMoney(payments.filter((p) => p.invoiceId === invoiceId).reduce((s, p) => s + p.amount, 0));
}

function invoiceStatus(invoice, payments, today = "2026-01-01") {
  const paid = paidAmountForInvoice(payments, invoice.id);
  if (paid >= invoice.total - 0.009) return "paid";
  if (paid > 0 && invoice.dueDate && invoice.dueDate < today) return "overdue";
  if (paid > 0) return "partial";
  if (invoice.dueDate && invoice.dueDate < today) return "overdue";
  return "unpaid";
}

function applyInventoryForOrder(products, order, previous) {
  let nextProducts = products.map((p) => ({ ...p }));
  let nextOrder = { ...order };
  const restore = (target) => {
    if (!target.inventoryApplied) return;
    for (const item of target.items) {
      if (!item.productId) continue;
      const product = nextProducts.find((p) => p.id === item.productId);
      if (product) product.stock += item.quantity;
    }
  };
  const deduct = (target) => {
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

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const products = [{ id: "p1", stock: 10 }];
const pending = {
  id: "o1",
  status: "pending",
  inventoryApplied: false,
  items: [{ productId: "p1", quantity: 3 }],
};
let result = applyInventoryForOrder(products, pending);
assert(result.products[0].stock === 10, "pending must not change stock");

result = applyInventoryForOrder(result.products, { ...result.order, status: "completed" }, result.order);
assert(result.products[0].stock === 7, `complete should deduct, got ${result.products[0].stock}`);
assert(result.order.inventoryApplied === true, "flag after complete");

result = applyInventoryForOrder(result.products, { ...result.order, status: "cancelled" }, result.order);
assert(result.products[0].stock === 10, "cancel should restore stock");

const invoice = { id: "i1", total: 300, dueDate: "2099-01-01" };
assert(invoiceStatus(invoice, []) === "unpaid", "unpaid");
assert(invoiceStatus(invoice, [{ invoiceId: "i1", amount: 100 }]) === "partial", "partial");
assert(invoiceStatus(invoice, [{ invoiceId: "i1", amount: 300 }]) === "paid", "paid");
assert(invoiceStatus({ ...invoice, dueDate: "2000-01-01" }, []) === "overdue", "overdue");

const backup = JSON.stringify({ customers: [{ id: "c1", name: "Ada" }], products: [], orders: [], invoices: [], settings: { currency: "LKR" } });
JSON.parse(backup);
try {
  JSON.parse("{nope");
  throw new Error("invalid json should throw");
} catch (e) {
  if (e.message === "invalid json should throw") throw e;
}

assert(JSON.parse('{"customers":[{"id":"x"}]}').customers[0].id === "x", "parse");

console.log("verify-flow: ok");
