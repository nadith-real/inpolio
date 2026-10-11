import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { LineItemsEditor } from "@/components/shared/line-items";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { WriteGate } from "@/components/auth/write-gate";
import { useStore } from "@/lib/store";
import { calcLineTotals, createId, formatDate, formatMoney, matchesQuery, nextNumber, nowIso } from "@/lib/utils";
import type { LineItem, Order, OrderStatus, PaymentStatus } from "@/types";

type Form = {
  customerId: string;
  items: LineItem[];
  discount: number;
  notes: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  date: string;
};

const emptyForm = (): Form => ({
  customerId: "",
  items: [{ name: "", quantity: 1, unitPrice: 0 }],
  discount: 0,
  notes: "",
  status: "pending",
  paymentStatus: "unpaid",
  date: nowIso().slice(0, 10),
});

export function OrdersPage() {
  const { data, saveOrder, remove } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [delId, setDelId] = useState<string | null>(null);
  const currency = data.settings.currency;
  const totals = calcLineTotals(form.items, form.discount, data.settings.taxRate);
  const name = (id: string) => data.customers.find((c) => c.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    return data.orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      return matchesQuery(`${o.orderNumber} ${name(o.customerId)} ${o.notes}`, query);
    });
  }, [data.orders, data.customers, query, status]);

  const save = () => {
    const next: Record<string, string> = {};
    if (!form.customerId) next.customerId = "Select a customer.";
    if (!form.items.length || form.items.every((i) => !i.name.trim())) next.items = "Add at least one item.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const record: Order = {
      id: editing?.id ?? createId(),
      orderNumber: editing?.orderNumber ?? nextNumber("ORD", data.orders.map((o) => o.orderNumber)),
      customerId: form.customerId,
      items: form.items.filter((i) => i.name.trim()),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      paymentStatus: form.paymentStatus,
      status: form.status,
      date: form.date,
      notes: form.notes,
      inventoryApplied: editing?.inventoryApplied ?? false,
      isDemo: editing?.isDemo,
    };
    saveOrder(record, editing ?? undefined);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Completing an order deducts stock. Changing it away from completed restores stock."
        actions={
          <WriteGate>
            <Button onClick={() => { setEditing(null); setForm(emptyForm()); setErrors({}); setOpen(true); }}>
              <Plus /> New order
            </Button>
          </WriteGate>
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search orders…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search orders" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44" aria-label="Filter status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(["pending", "confirmed", "processing", "completed", "cancelled"] as OrderStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No orders" description="Create an order after adding a customer and products." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link className="font-medium hover:underline" to={`/orders/${o.id}`}>{o.orderNumber}</Link>
                  {o.isDemo ? <span className="ml-2 text-[10px] uppercase text-muted-foreground">Demo</span> : null}
                </TableCell>
                <TableCell>{name(o.customerId)}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(o.date)}</TableCell>
                <TableCell><StatusBadge value={o.status} /></TableCell>
                <TableCell className="hidden md:table-cell"><StatusBadge value={o.paymentStatus} /></TableCell>
                <TableCell className="text-right">{formatMoney(o.total, currency)}</TableCell>
                <TableCell className="text-right">
                  <WriteGate>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditing(o);
                      setForm({
                        customerId: o.customerId,
                        items: o.items,
                        discount: o.discount,
                        notes: o.notes,
                        status: o.status,
                        paymentStatus: o.paymentStatus,
                        date: o.date.slice(0, 10),
                      });
                      setErrors({});
                      setOpen(true);
                    }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDelId(o.id)}>Delete</Button>
                  </WriteGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit order" : "New order"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer" error={errors.customerId}>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {data.customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date" htmlFor="ord-date">
              <Input id="ord-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Order status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as OrderStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["pending", "confirmed", "processing", "completed", "cancelled"] as OrderStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Payment status">
              <Select value={form.paymentStatus} onValueChange={(v) => setForm({ ...form, paymentStatus: v as PaymentStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["unpaid", "partial", "paid", "overdue"] as PaymentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium">Items</p>
              {errors.items ? <p className="mb-1 text-xs text-destructive">{errors.items}</p> : null}
              <LineItemsEditor items={form.items} products={data.products} currency={currency} onChange={(items) => setForm({ ...form, items })} />
            </div>
            <Field label="Discount" htmlFor="ord-disc">
              <Input id="ord-disc" type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
            </Field>
            <div className="text-sm">
              <p>Subtotal {formatMoney(totals.subtotal, currency)}</p>
              <p>Tax {formatMoney(totals.tax, currency)}</p>
              <p className="font-medium">Total {formatMoney(totals.total, currency)}</p>
            </div>
            <Field label="Notes" className="sm:col-span-2" htmlFor="ord-notes">
              <Textarea id="ord-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete order?"
        description="Deleting a completed order restores the stock it deducted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (delId) remove("orders", delId); setDelId(null); }}
      />
    </div>
  );
}
