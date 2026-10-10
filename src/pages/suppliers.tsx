import { useMemo, useState } from "react";
import { Plus, Truck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { useStore } from "@/lib/store";
import { createId, matchesQuery } from "@/lib/utils";
import type { Supplier } from "@/types";

const empty = (): Omit<Supplier, "id" | "isDemo"> => ({
  name: "", company: "", phone: "", email: "", address: "", notes: "",
});

export function SuppliersPage() {
  const { data, upsert, remove } = useStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(empty());
  const [error, setError] = useState("");
  const [delId, setDelId] = useState<string | null>(null);

  const rows = useMemo(
    () => data.suppliers.filter((s) => matchesQuery(`${s.name} ${s.company} ${s.email} ${s.phone}`, query)),
    [data.suppliers, query],
  );

  const productsFor = (id: string) => data.products.filter((p) => p.supplierId === id);

  const save = () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    upsert("suppliers", { ...form, id: editing?.id ?? createId(), name: form.name.trim(), isDemo: editing?.isDemo });
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendors linked to inventory products."
        actions={<Button onClick={() => { setEditing(null); setForm(empty()); setError(""); setOpen(true); }}><Plus /> New supplier</Button>}
      />
      <Input className="mb-3 max-w-md" placeholder="Search suppliers…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search suppliers" />
      {rows.length === 0 ? (
        <EmptyState icon={Truck} title="No suppliers" description="Add a supplier and link products in Inventory." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Company</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead>Products</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  {s.name}
                  {s.isDemo ? <span className="ml-2 text-[10px] uppercase text-muted-foreground">Demo</span> : null}
                </TableCell>
                <TableCell className="hidden md:table-cell">{s.company || "—"}</TableCell>
                <TableCell className="hidden sm:table-cell">{s.phone || "—"}</TableCell>
                <TableCell>{productsFor(s.id).map((p) => p.name).join(", ") || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setForm({ name: s.name, company: s.company, phone: s.phone, email: s.email, address: s.address, notes: s.notes }); setError(""); setOpen(true); }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelId(s.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit supplier" : "New supplier"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="sup-name" error={error}>
              <Input id="sup-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Company" htmlFor="sup-co">
              <Input id="sup-co" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </Field>
            <Field label="Phone" htmlFor="sup-phone">
              <Input id="sup-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="sup-email">
              <Input id="sup-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Address" className="sm:col-span-2" htmlFor="sup-addr">
              <Input id="sup-addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Notes" className="sm:col-span-2" htmlFor="sup-notes">
              <Textarea id="sup-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
        title="Delete supplier?"
        description="Products remain; their supplier link is cleared only if you edit them."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (delId) remove("suppliers", delId); setDelId(null); }}
      />
    </div>
  );
}
