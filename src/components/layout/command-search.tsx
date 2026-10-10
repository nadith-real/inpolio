import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";

export function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data } = useStore();
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
    if (!q) return { customers: data.customers.slice(0, 5), leads: data.leads.slice(0, 5), orders: data.orders.slice(0, 5), products: data.products.slice(0, 5), invoices: data.invoices.slice(0, 5), appointments: data.appointments.slice(0, 5), tasks: data.tasks.slice(0, 5) };
    const has = (...vals: string[]) => vals.join(" ").toLowerCase().includes(q);
    return {
      customers: data.customers.filter((c) => has(c.name, c.company, c.email, c.phone)).slice(0, 8),
      leads: data.leads.filter((l) => has(l.name, l.company, l.contact, l.email)).slice(0, 8),
      orders: data.orders.filter((o) => has(o.orderNumber, o.notes)).slice(0, 8),
      products: data.products.filter((p) => has(p.name, p.sku, p.category)).slice(0, 8),
      invoices: data.invoices.filter((i) => has(i.invoiceNumber, i.notes)).slice(0, 8),
      appointments: data.appointments.filter((a) => has(a.title, a.notes)).slice(0, 8),
      tasks: data.tasks.filter((t) => has(t.title, t.description)).slice(0, 8),
    };
  }, [q, data]);

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
