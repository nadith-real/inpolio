import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Calendar, LayoutDashboard, Package, Receipt, ShoppingCart, TrendingUp, Users, Wallet } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeAnalytics } from "@/lib/analytics";
import { useStore } from "@/lib/store";
import { formatMoney, formatDate, todayIsoDate } from "@/lib/utils";
import type { DashboardRange } from "@/types";
import { EmptyState } from "@/components/ui/empty";

const RANGES: { id: DashboardRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "year", label: "This year" },
];

export function DashboardPage() {
  const { data } = useStore();
  const [range, setRange] = useState<DashboardRange>("30d");
  const snap = useMemo(() => computeAnalytics(data, range), [data, range]);
  const currency = data.settings.currency;
  const today = todayIsoDate();
  const customerName = (id: string) => data.customers.find((c) => c.id === id)?.name ?? "—";

  const recentOrders = [...data.orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const outstanding = data.invoices.filter((i) => i.paymentStatus !== "paid").slice(0, 6);
  const low = data.products.filter((p) => p.stock <= p.lowStockThreshold);
  const todayApts = data.appointments.filter((a) => a.date === today && !["cancelled", "completed", "no-show"].includes(a.status));
  const todayTasks = data.tasks.filter((t) => t.dueDate === today && t.status !== "completed");
  const alerts: string[] = [];
  if (snap.overdueInvoices) alerts.push(`${snap.overdueInvoices} overdue invoice${snap.overdueInvoices === 1 ? "" : "s"}`);
  if (snap.lowStock) alerts.push(`${snap.lowStock} low-stock product${snap.lowStock === 1 ? "" : "s"}`);
  if (snap.outOfStock) alerts.push(`${snap.outOfStock} out of stock`);
  const overdueTasks = data.tasks.filter((t) => t.status !== "completed" && t.dueDate && t.dueDate < today).length;
  if (overdueTasks) alerts.push(`${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"}`);

  const empty = data.customers.length === 0 && data.orders.length === 0 && data.products.length === 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live figures from data stored on this computer."
        actions={
          <div className="flex flex-wrap gap-1">
            {RANGES.map((r) => (
              <Button key={r.id} size="sm" variant={range === r.id ? "default" : "outline"} onClick={() => setRange(r.id)}>
                {r.label}
              </Button>
            ))}
          </div>
        }
      />

      {empty ? (
        <EmptyState
          icon={LayoutDashboard}
          title="No business data yet"
          description="Add customers and products, or load demo data from Settings to explore the workspace."
          action={
            <Button asChild>
              <Link to="/settings">Open settings</Link>
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Revenue" value={formatMoney(snap.revenue, currency)} hint={RANGES.find((r) => r.id === range)?.label} icon={Wallet} />
        <StatCard label="Profit" value={formatMoney(snap.profit, currency)} hint={`Costs ${formatMoney(snap.costs, currency)}`} icon={TrendingUp} />
        <StatCard label="Outstanding" value={formatMoney(snap.outstanding, currency)} hint={`${snap.overdueInvoices} overdue`} icon={Receipt} />
        <StatCard label="Orders" value={String(snap.orders)} hint={`${snap.completedOrders} completed`} icon={ShoppingCart} />
        <StatCard label="Customers" value={String(snap.customers)} hint={`${snap.newCustomers} new in range`} icon={Users} />
        <StatCard label="Inventory value" value={formatMoney(snap.inventoryValue, currency)} hint={`${snap.lowStock} low stock`} icon={Package} />
      </div>

      {alerts.length ? (
        <Card className="mt-4 border-amber-300/70">
          <CardContent className="flex items-start gap-2 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <div>
              <p className="font-medium">Business alerts</p>
              <p className="text-muted-foreground">{alerts.join(" · ")}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent className="h-56">
            {snap.revenueByDay.every((d) => d.revenue === 0) ? (
              <p className="text-sm text-muted-foreground">No completed sales in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snap.revenueByDay}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} hide={snap.revenueByDay.length > 20} />
                  <YAxis tick={{ fontSize: 11 }} width={48} />
                  <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                  <Area type="monotone" dataKey="revenue" stroke="currentColor" fill="currentColor" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground">
                <Calendar className="h-3 w-3" /> Appointments
              </p>
              {todayApts.length ? todayApts.map((a) => (
                <p key={a.id}>{a.startTime} {a.title}</p>
              )) : <p className="text-muted-foreground">None</p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Tasks due</p>
              {todayTasks.length ? todayTasks.map((t) => (
                <p key={t.id}>{t.title}</p>
              )) : <p className="text-muted-foreground">None</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Button variant="link" size="sm" asChild><Link to="/orders">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell><Link className="hover:underline" to={`/orders/${o.id}`}>{o.orderNumber}</Link></TableCell>
                      <TableCell>{customerName(o.customerId)}</TableCell>
                      <TableCell><StatusBadge value={o.status} /></TableCell>
                      <TableCell className="text-right">{formatMoney(o.total, currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Outstanding payments</CardTitle>
            <Button variant="link" size="sm" asChild><Link to="/invoices">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {outstanding.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding invoices.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstanding.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell><Link className="hover:underline" to={`/invoices/${i.id}`}>{i.invoiceNumber}</Link></TableCell>
                      <TableCell>{formatDate(i.dueDate)}</TableCell>
                      <TableCell><StatusBadge value={i.paymentStatus} /></TableCell>
                      <TableCell className="text-right">{formatMoney(i.total, currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Low-stock products</CardTitle>
          <Button variant="link" size="sm" asChild><Link to="/inventory">Inventory</Link></Button>
        </CardHeader>
        <CardContent>
          {low.length === 0 ? (
            <p className="text-sm text-muted-foreground">Stock levels are healthy.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {low.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.sku || "—"}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>{p.lowStockThreshold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
