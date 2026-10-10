import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CustomerForm, emptyCustomer, type CustomerFormValue } from "@/components/modules/customer-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { useStore } from "@/lib/store";
import { createId, formatDate, formatMoney, matchesQuery, nowIso, sortBy } from "@/lib/utils";
import type { Customer, CustomerStatus } from "@/types";

export function CustomersPage() {
  const { data, upsert, remove } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<"name" | "createdAt" | "totalSpent">("name");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormValue>(emptyCustomer());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [delId, setDelId] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = data.customers.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      return matchesQuery(`${c.name} ${c.company} ${c.email} ${c.phone} ${c.tags.join(" ")}`, query);
    });
    return sortBy(list, sort, sort === "name" ? "asc" : "desc");
  }, [data.customers, query, status, sort]);

  const save = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const record: Customer = {
      id: editing?.id ?? createId(),
      name: form.name.trim(),
      company: form.company.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      status: form.status,
      createdAt: editing?.createdAt ?? nowIso(),
      lastInteraction: nowIso(),
      totalSpent: editing?.totalSpent ?? 0,
      isDemo: editing?.isDemo,
    };
    upsert("customers", record);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Customers"
        description="CRM records stored on this device."
        actions={
          <Button onClick={() => { setEditing(null); setForm(emptyCustomer()); setErrors({}); setOpen(true); }}>
            <Plus /> New customer
          </Button>
        }
      />
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search name, company, email…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search customers" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-40" aria-label="Filter status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(["lead", "prospect", "customer", "inactive"] as CustomerStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="sm:w-40" aria-label="Sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="totalSpent">Total spent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No customers" description="Add a customer or load demo data from Settings." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Company</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link className="font-medium hover:underline" to={`/customers/${c.id}`}>{c.name}</Link>
                  {c.isDemo ? <span className="ml-2 text-[10px] uppercase text-muted-foreground">Demo</span> : null}
                </TableCell>
                <TableCell className="hidden md:table-cell">{c.company || "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">{c.email || "—"}</TableCell>
                <TableCell><StatusBadge value={c.status} /></TableCell>
                <TableCell className="hidden sm:table-cell">{formatDate(c.createdAt)}</TableCell>
                <TableCell className="text-right">{formatMoney(c.totalSpent, data.settings.currency)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditing(c);
                    setForm({
                      name: c.name, company: c.company, email: c.email, phone: c.phone, address: c.address,
                      notes: c.notes, tags: c.tags.join(", "), status: c.status,
                    });
                    setErrors({});
                    setOpen(true);
                  }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelId(c.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit customer" : "New customer"}</DialogTitle>
          </DialogHeader>
          <CustomerForm value={form} onChange={setForm} errors={errors} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete customer?"
        description="This removes the customer record. Related orders and invoices are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (delId) remove("customers", delId); setDelId(null); }}
      />
    </div>
  );
}
