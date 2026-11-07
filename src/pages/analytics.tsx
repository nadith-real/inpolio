import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeAnalytics } from "@/lib/analytics";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import type { DashboardRange } from "@/types";

const RANGES: { id: DashboardRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "year", label: "This year" },
];

export function AnalyticsPage() {
  const { data } = useStore();
  const [range, setRange] = useState<DashboardRange>("30d");
  const snap = useMemo(() => computeAnalytics(data, range), [data, range]);
  const currency = data.settings.currency;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Figures computed from stored orders, invoices, payments and products."
        actions={
          <div className="flex flex-wrap rounded-md border border-border p-0.5">
            {RANGES.map((r) => (
              <Button key={r.id} size="sm" variant={range === r.id ? "secondary" : "ghost"} onClick={() => setRange(r.id)}>
                {r.label}
              </Button>
            ))}
          </div>
        }
      />
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sales</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(snap.revenue, currency)} />
        <StatCard label="Orders" value={String(snap.orders)} />
        <StatCard label="Completed" value={String(snap.completedOrders)} />
        <StatCard label="Avg order value" value={formatMoney(snap.averageOrderValue, currency)} />
      </div>
      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customers</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total customers" value={String(snap.customers)} />
        <StatCard label="New in range" value={String(snap.newCustomers)} />
        <StatCard label="Returning (prior spend)" value={String(snap.returningCustomers)} />
      </div>
      <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Finance</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(snap.revenue, currency)} />
        <StatCard label="Costs" value={formatMoney(snap.costs, currency)} />
        <StatCard label="Profit" value={formatMoney(snap.profit, currency)} />
        <StatCard label="Outstanding" value={formatMoney(snap.outstanding, currency)} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Best sellers</CardTitle></CardHeader>
          <CardContent>
            {snap.bestSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed sales in this period.</p>
            ) : (
              <>
                <div className="mb-4 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={snap.bestSellers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" interval={0} hide={snap.bestSellers.length > 4} />
                      <YAxis tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" width={32} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-popover)",
                          border: "1px solid var(--color-border)",
                          borderRadius: "0.375rem",
                          fontSize: "12px",
                          boxShadow: "none",
                        }}
                      />
                      <Bar dataKey="quantity" fill="currentColor" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snap.bestSellers.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.quantity}</TableCell>
                        <TableCell className="text-right">{formatMoney(p.revenue, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Poor performers / unsold</CardTitle></CardHeader>
          <CardContent>
            {snap.poorPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product data.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snap.poorPerformers.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.quantity}</TableCell>
                      <TableCell className="text-right">{formatMoney(p.revenue, currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Customer lifetime value</CardTitle></CardHeader>
        <CardContent>
          {snap.lifetimeValues.every((c) => c.value === 0) ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Lifetime payments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.lifetimeValues.map((c) => (
                  <TableRow key={c.customerId}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">{formatMoney(c.value, currency)}</TableCell>
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
