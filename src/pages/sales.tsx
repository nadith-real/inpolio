import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeAnalytics } from "@/lib/analytics";
import { useStore } from "@/lib/store";
import { formatMoney, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function SalesPage() {
  const { data } = useStore();
  const snap = computeAnalytics(data, "30d");
  const currency = data.settings.currency;
  const pipeline = data.leads.reduce((s, l) => s + (l.stage === "won" || l.stage === "lost" ? 0 : l.potentialValue), 0);
  const recent = [...data.orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const name = (id: string) => data.customers.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader title="Sales" description="Pipeline value and recent closed business." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (30d)" value={formatMoney(snap.revenue, currency)} />
        <StatCard label="Orders (30d)" value={String(snap.orders)} />
        <StatCard label="Avg order" value={formatMoney(snap.averageOrderValue, currency)} />
        <StatCard label="Open pipeline" value={formatMoney(pipeline, currency)} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button asChild variant="outline"><Link to="/crm">Open CRM board</Link></Button>
        <Button asChild variant="outline"><Link to="/orders">Orders</Link></Button>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell><Link className="hover:underline" to={`/orders/${o.id}`}>{o.orderNumber}</Link></TableCell>
                    <TableCell>{name(o.customerId)}</TableCell>
                    <TableCell>{formatDate(o.date)}</TableCell>
                    <TableCell><StatusBadge value={o.status} /></TableCell>
                    <TableCell className="text-right">{formatMoney(o.total, currency)}</TableCell>
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
