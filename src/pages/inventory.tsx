import { useMemo, useState } from "react";
import { Package, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { inventoryValue, lowStockProducts, outOfStockProducts } from "@/lib/business";
import { useStore } from "@/lib/store";
import { createId, formatMoney, matchesQuery } from "@/lib/utils";
import type { Product } from "@/types";

type Form = Omit<Product, "id" | "isDemo">;

const emptyForm = (): Form => ({
  name: "",
  sku: "",
  category: "General",
  description: "",
  purchasePrice: 0,
  sellingPrice: 0,
  stock: 0,
  lowStockThreshold: 5,
  supplierId: "",
});

export function InventoryPage() {
  const { data, upsert, remove } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [delId, setDelId] = useState<string | null>(null);
  const [adjust, setAdjust] = useState({ id: "", delta: 0, reason: "" });
  const currency = data.settings.currency;
  const categories = [...new Set(data.products.map((p) => p.category).filter(Boolean))];

  const rows = useMemo(() => {
    return data.products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      return matchesQuery(`${p.name} ${p.sku} ${p.category} ${p.description}`, query);
    });
  }, [data.products, query, category]);

  const save = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (form.sku && data.products.some((p) => p.sku === form.sku && p.id !== editing?.id)) next.sku = "SKU already exists.";
    setErrors(next);
    if (Object.keys(next).length) return;
    upsert("products", { ...form, id: editing?.id ?? createId(), name: form.name.trim(), isDemo: editing?.isDemo });
    setOpen(false);
  };

  const applyAdjust = () => {
    const product = data.products.find((p) => p.id === adjust.id);
    if (!product || !Number.isFinite(adjust.delta) || adjust.delta === 0) return;
    upsert("products", { ...product, stock: product.stock + adjust.delta });
    setAdjustOpen(false);
  };

  const stockBadge = (p: Product) => {
    if (p.stock <= 0) return <Badge variant="danger">Out of stock</Badge>;
    if (p.stock <= p.lowStockThreshold) return <Badge variant="warning">Low</Badge>;
    return <Badge variant="success">In stock</Badge>;
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Products, stock levels and supplier links."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setAdjust({ id: data.products[0]?.id ?? "", delta: 0, reason: "" }); setAdjustOpen(true); }}>
              Adjust stock
            </Button>
            <Button onClick={() => { setEditing(null); setForm(emptyForm()); setErrors({}); setOpen(true); }}>
              <Plus /> New product
            </Button>
          </div>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total products" value={String(data.products.length)} />
        <StatCard label="Inventory value" value={formatMoney(inventoryValue(data.products), currency)} />
        <StatCard label="Low stock" value={String(lowStockProducts(data.products).length)} />
        <StatCard label="Out of stock" value={String(outOfStockProducts(data.products).length)} />
      </div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-44" aria-label="Filter category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={Package} title="No products" description="Add products to sell and track stock." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">SKU</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="hidden lg:table-cell">Sell</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <span className="font-medium">{p.name}</span>
                  {p.isDemo ? <span className="ml-2 text-[10px] uppercase text-muted-foreground">Demo</span> : null}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{p.sku || "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{p.category}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">{p.stock} {stockBadge(p)}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">{formatMoney(p.sellingPrice, currency)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditing(p);
                    setForm({
                      name: p.name, sku: p.sku, category: p.category, description: p.description,
                      purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice, stock: p.stock,
                      lowStockThreshold: p.lowStockThreshold, supplierId: p.supplierId,
                    });
                    setErrors({});
                    setOpen(true);
                  }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelId(p.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="prd-name" error={errors.name}>
              <Input id="prd-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="SKU" htmlFor="prd-sku" error={errors.sku}>
              <Input id="prd-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Category" htmlFor="prd-cat">
              <Input id="prd-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </Field>
            <Field label="Supplier">
              <Select value={form.supplierId || "__none"} onValueChange={(v) => setForm({ ...form, supplierId: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {data.suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Purchase price" htmlFor="prd-buy">
              <Input id="prd-buy" type="number" min={0} step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
            </Field>
            <Field label="Selling price" htmlFor="prd-sell">
              <Input id="prd-sell" type="number" min={0} step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} />
            </Field>
            <Field label="Current stock" htmlFor="prd-stock">
              <Input id="prd-stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
            </Field>
            <Field label="Low-stock threshold" htmlFor="prd-low">
              <Input id="prd-low" type="number" min={0} value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />
            </Field>
            <Field label="Description" className="sm:col-span-2" htmlFor="prd-desc">
              <Textarea id="prd-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stock adjustment</DialogTitle></DialogHeader>
          <Field label="Product">
            <Select value={adjust.id} onValueChange={(v) => setAdjust({ ...adjust, id: v })}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {data.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock})</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Change (+/-)" htmlFor="adj-delta">
            <Input id="adj-delta" type="number" value={adjust.delta} onChange={(e) => setAdjust({ ...adjust, delta: Number(e.target.value) })} />
          </Field>
          <Field label="Reason" htmlFor="adj-reason">
            <Input id="adj-reason" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={applyAdjust}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete product?"
        description="Existing orders keep the product name on their line items."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (delId) remove("products", delId); setDelId(null); }}
      />
    </div>
  );
}
