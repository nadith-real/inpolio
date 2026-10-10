import { useMemo, useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { useStore } from "@/lib/store";
import { createId, formatDate, formatMoney, matchesQuery, nowIso } from "@/lib/utils";
import type { Payment, PaymentMethod } from "@/types";

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "card", label: "Card" },
  { id: "other", label: "Other" },
];

export function PaymentsPage() {
  const { data, upsert, remove } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ invoiceId: "", amount: 0, method: "cash" as PaymentMethod, date: nowIso().slice(0, 10), reference: "", notes: "" });
  const [error, setError] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const currency = data.settings.currency;
  const invoice = data.invoices.find((i) => i.id === form.invoiceId);
  const customerName = (id: string) => data.customers.find((c) => c.id === id)?.name ?? "—";
  const invoiceNumber = (id: string) => data.invoices.find((i) => i.id === id)?.invoiceNumber ?? "—";

  const rows = useMemo(
    () => data.payments.filter((p) => matchesQuery(`${customerName(p.customerId)} ${invoiceNumber(p.invoiceId)} ${p.reference} ${p.notes}`, query)),
    [data.payments, data.customers, data.invoices, query],
  );

  const save = () => {
    if (!form.invoiceId) { setError("Select an invoice."); return; }
    if (!(form.amount > 0)) { setError("Amount must be greater than zero."); return; }
    const inv = data.invoices.find((i) => i.id === form.invoiceId);
    if (!inv) { setError("Invoice not found."); return; }
    const record: Payment = {
      id: createId(),
      customerId: inv.customerId,
      invoiceId: inv.id,
      amount: form.amount,
      method: form.method,
      date: form.date,
      reference: form.reference.trim(),
      notes: form.notes.trim(),
    };
    upsert("payments", record);
    setOpen(false);
    setError("");
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record cash, bank, card or other payments. No payment gateways."
        actions={<Button onClick={() => { setForm({ invoiceId: "", amount: 0, method: "cash", date: nowIso().slice(0, 10), reference: "", notes: "" }); setError(""); setOpen(true); }}><Plus /> Record payment</Button>}
      />
      <Input className="mb-3 max-w-md" placeholder="Search payments…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search payments" />
      {rows.length === 0 ? (
        <EmptyState icon={Receipt} title="No payments" description="Record a payment against an invoice." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{formatDate(p.date)}</TableCell>
                <TableCell>{customerName(p.customerId)}</TableCell>
                <TableCell>{invoiceNumber(p.invoiceId)}</TableCell>
                <TableCell>{METHODS.find((m) => m.id === p.method)?.label ?? p.method}</TableCell>
                <TableCell className="text-right">{formatMoney(p.amount, currency)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDelId(p.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Invoice" error={error}>
              <Select value={form.invoiceId} onValueChange={(v) => {
                const inv = data.invoices.find((i) => i.id === v);
                setForm({ ...form, invoiceId: v, amount: inv ? inv.total : form.amount });
                setError("");
              }}>
                <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                <SelectContent>
                  {data.invoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.invoiceNumber} · {customerName(i.customerId)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {invoice ? <p className="text-xs text-muted-foreground">Invoice total {formatMoney(invoice.total, currency)}</p> : null}
            <Field label="Amount" htmlFor="pay-amt">
              <Input id="pay-amt" type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Field>
            <Field label="Method">
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v as PaymentMethod })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date" htmlFor="pay-date">
              <Input id="pay-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Reference" htmlFor="pay-ref">
              <Input id="pay-ref" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </Field>
            <Field label="Notes" htmlFor="pay-notes">
              <Textarea id="pay-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
        title="Delete payment?"
        description="Invoice status will be recalculated after this payment is removed."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (delId) remove("payments", delId); setDelId(null); }}
      />
    </div>
  );
}
