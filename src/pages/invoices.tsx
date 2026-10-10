import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
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
import { useStore } from "@/lib/store";
import { calcLineTotals, createId, formatDate, formatMoney, matchesQuery, nextNumber, nowIso, todayIsoDate } from "@/lib/utils";
import type { Invoice, LineItem } from "@/types";

type Form = {
  customerId: string;
  items: LineItem[];
  discount: number;
  notes: string;
  issueDate: string;
  dueDate: string;
};

const emptyForm = (): Form => ({
  customerId: "",
  items: [{ name: "", quantity: 1, unitPrice: 0 }],
  discount: 0,
  notes: "",
  issueDate: todayIsoDate(),
  dueDate: todayIsoDate(),
});

export function InvoicesPage() {
  const { data, upsert, remove } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [delId, setDelId] = useState<string | null>(null);
  const currency = data.settings.currency;
  const totals = calcLineTotals(form.items, form.discount, data.settings.taxRate);
  const name = (id: string) => data.customers.find((c) => c.id === id)?.name ?? "—";

  const rows = useMemo(() => {
    return data.invoices.filter((i) => {
      if (status !== "all" && i.paymentStatus !== status) return false;
      return matchesQuery(`${i.invoiceNumber} ${name(i.customerId)} ${i.notes}`, query);
    });
  }, [data.invoices, data.customers, query, status]);

  const persist = (base?: Invoice) => {
    const next: Record<string, string> = {};
    if (!form.customerId) next.customerId = "Select a customer.";
    if (!form.items.length || form.items.every((i) => !i.name.trim())) next.items = "Add at least one item.";
    setErrors(next);
    if (Object.keys(next).length) return false;
    const record: Invoice = {
      id: base?.id ?? createId(),
      invoiceNumber: base?.invoiceNumber ?? nextNumber("INV", data.invoices.map((i) => i.invoiceNumber)),
      customerId: form.customerId,
      orderId: base?.orderId,
      items: form.items.filter((i) => i.name.trim()),
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
      paymentStatus: "unpaid",
      notes: form.notes,
      isDemo: base?.isDemo,
    };
    upsert("invoices", record);
    return true;
  };

  const duplicate = (invoice: Invoice) => {
    upsert("invoices", {
      ...invoice,
      id: createId(),
      invoiceNumber: nextNumber("INV", data.invoices.map((i) => i.invoiceNumber)),
      issueDate: nowIso(),
      dueDate: todayIsoDate(),
      paymentStatus: "unpaid",
      isDemo: false,
    });
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create, duplicate and print invoices. Status updates when payments are recorded."
        actions={
          <Button onClick={() => { setEditing(null); setForm(emptyForm()); setErrors({}); setOpen(true); }}>
            <Plus /> New invoice
          </Button>
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search invoices…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search invoices" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40" aria-label="Filter status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={FileText} title="No invoices" description="Create an invoice for a customer." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  <Link className="font-medium hover:underline" to={`/invoices/${i.id}`}>{i.invoiceNumber}</Link>
                  {i.isDemo ? <span className="ml-2 text-[10px] uppercase text-muted-foreground">Demo</span> : null}
                </TableCell>
                <TableCell>{name(i.customerId)}</TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(i.dueDate)}</TableCell>
                <TableCell><StatusBadge value={i.paymentStatus} /></TableCell>
                <TableCell className="text-right">{formatMoney(i.total, currency)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditing(i);
                    setForm({
                      customerId: i.customerId,
                      items: i.items,
                      discount: i.discount,
                      notes: i.notes,
                      issueDate: i.issueDate.slice(0, 10),
                      dueDate: i.dueDate,
                    });
                    setErrors({});
                    setOpen(true);
                  }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicate(i)}>Duplicate</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelId(i.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit invoice" : "New invoice"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer" error={errors.customerId}>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {data.customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Issue date" htmlFor="inv-issue">
              <Input id="inv-issue" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </Field>
            <Field label="Due date" htmlFor="inv-due">
              <Input id="inv-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium">Items</p>
              {errors.items ? <p className="mb-1 text-xs text-destructive">{errors.items}</p> : null}
              <LineItemsEditor items={form.items} products={data.products} currency={currency} onChange={(items) => setForm({ ...form, items })} />
            </div>
            <Field label="Discount" htmlFor="inv-disc">
              <Input id="inv-disc" type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
            </Field>
            <div className="text-sm">
              <p>Subtotal {formatMoney(totals.subtotal, currency)}</p>
              <p>Tax {formatMoney(totals.tax, currency)}</p>
              <p className="font-medium">Total {formatMoney(totals.total, currency)}</p>
            </div>
            <Field label="Notes" className="sm:col-span-2" htmlFor="inv-notes">
              <Textarea id="inv-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (persist(editing ?? undefined)) setOpen(false); }}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete invoice?"
        description="Related payments stay in the payments list unless you delete them separately."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (delId) remove("invoices", delId); setDelId(null); }}
      />
    </div>
  );
}
