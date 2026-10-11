import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";

export function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, can } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const empty = { customers: [], leads: [], orders: [], products: [], invoices: [], appointments: [], tasks: [] };
    const has = (...vals: string[]) => vals.join(" ").toLowerCase().includes(q);
    const take = <T,>(items: T[], allowed: boolean, filter: (item: T) => boolean) =>
      allowed ? (q ? items.filter(filter) : items).slice(0, q ? 8 : 5) : [];
    if (!q && !can("customers") && !can("crm") && !can("orders") && !can("inventory") && !can("invoices") && !can("appointments") && !can("tasks")) return empty;
    return {
      customers: take(data.customers, can("customers"), (c) => has(c.name, c.company, c.email, c.phone)),
      leads: take(data.leads, can("crm"), (l) => has(l.name, l.company, l.contact, l.email)),
      orders: take(data.orders, can("orders"), (o) => has(o.orderNumber, o.notes)),
      products: take(data.products, can("inventory"), (p) => has(p.name, p.sku, p.category)),
      invoices: take(data.invoices, can("invoices"), (i) => has(i.invoiceNumber, i.notes)),
      appointments: take(data.appointments, can("appointments"), (a) => has(a.title, a.notes)),
      tasks: take(data.tasks, can("tasks"), (t) => has(t.title, t.description)),
    };
  }, [q, data, can]);

  const go = (to: string) => {
    onOpenChange(false);
    setQuery("");
    navigate(to);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 overflow-hidden max-w-lg" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command label="Global search" shouldFilter={false} className="bg-background">
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Search customers, orders, products..."
            className="h-11 w-full border-b bg-transparent px-4 text-sm outline-none"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="p-4 text-sm text-muted-foreground">No matches.</Command.Empty>
            {results.customers.length ? (
              <Command.Group heading="Customers" className="mb-2 text-xs text-muted-foreground">
                {results.customers.map((c) => (
                  <Command.Item key={c.id} onSelect={() => go(`/customers/${c.id}`)} className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-accent">
                    {c.name} {c.company ? `· ${c.company}` : ""}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
            {results.leads.length ? (
              <Command.Group heading="Leads" className="mb-2 text-xs text-muted-foreground">
                {results.leads.map((l) => (
                  <Command.Item key={l.id} onSelect={() => go("/crm")} className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-accent">
                    {l.name} · {l.stage}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
            {results.orders.length ? (
              <Command.Group heading="Orders" className="mb-2 text-xs text-muted-foreground">
                {results.orders.map((o) => (
                  <Command.Item key={o.id} onSelect={() => go(`/orders/${o.id}`)} className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-accent">
                    {o.orderNumber}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
            {results.products.length ? (
              <Command.Group heading="Products" className="mb-2 text-xs text-muted-foreground">
                {results.products.map((p) => (
                  <Command.Item key={p.id} onSelect={() => go("/inventory")} className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-accent">
                    {p.name} · {p.sku}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
            {results.invoices.length ? (
              <Command.Group heading="Invoices" className="mb-2 text-xs text-muted-foreground">
                {results.invoices.map((i) => (
                  <Command.Item key={i.id} onSelect={() => go(`/invoices/${i.id}`)} className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-accent">
                    {i.invoiceNumber}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
            {results.appointments.length ? (
              <Command.Group heading="Appointments" className="mb-2 text-xs text-muted-foreground">
                {results.appointments.map((a) => (
                  <Command.Item key={a.id} onSelect={() => go("/appointments")} className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-accent">
                    {a.title}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
            {results.tasks.length ? (
              <Command.Group heading="Tasks" className="mb-2 text-xs text-muted-foreground">
                {results.tasks.map((t) => (
                  <Command.Item key={t.id} onSelect={() => go("/tasks")} className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-foreground data-[selected=true]:bg-accent">
                    {t.title}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
