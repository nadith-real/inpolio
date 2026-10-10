import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore } from "@/lib/store";
import { formatDate, formatMoney } from "@/lib/utils";

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useStore();
  const customer = data.customers.find((c) => c.id === id);
  const currency = data.settings.currency;
  if (!customer) {
    return (
      <div>
        <p className="text-sm">Customer not found.</p>
        <Button className="mt-2" variant="outline" onClick={() => navigate("/customers")}>Back</Button>
      </div>
    );
  }
  const orders = data.orders.filter((o) => o.customerId === customer.id);
  const invoices = data.invoices.filter((i) => i.customerId === customer.id);
  const payments = data.payments.filter((p) => p.customerId === customer.id);
  const appointments = data.appointments.filter((a) => a.customerId === customer.id);
  const tasks = data.tasks.filter((t) => t.customerId === customer.id);

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={customer.company || "No company"}
        actions={<Button variant="outline" asChild><Link to="/customers">All customers</Link></Button>}
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-4 text-sm">
            <p><span className="text-muted-foreground">Email:</span> {customer.email || "—"}</p>
            <p><span className="text-muted-foreground">Phone:</span> {customer.phone || "—"}</p>
            <p><span className="text-muted-foreground">Address:</span> {customer.address || "—"}</p>
            <p><span className="text-muted-foreground">Status:</span> <StatusBadge value={customer.status} /></p>
            <p><span className="text-muted-foreground">Created:</span> {formatDate(customer.createdAt)}</p>
            <p><span className="text-muted-foreground">Last interaction:</span> {formatDate(customer.lastInteraction)}</p>
            <p><span className="text-muted-foreground">Total spent:</span> {formatMoney(customer.totalSpent, currency)}</p>
            {customer.tags.length ? <p><span className="text-muted-foreground">Tags:</span> {customer.tags.join(", ")}</p> : null}
            {customer.isDemo ? <p className="text-xs uppercase text-muted-foreground">Demo record</p> : null}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{customer.notes || "No notes."}</CardContent>
        </Card>
      </div>
      <Section title="Purchases / orders" empty="No orders.">
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell><Link className="hover:underline" to={`/orders/${o.id}`}>{o.orderNumber}</Link></TableCell>
            <TableCell>{formatDate(o.date)}</TableCell>
            <TableCell><StatusBadge value={o.status} /></TableCell>
            <TableCell className="text-right">{formatMoney(o.total, currency)}</TableCell>
          </TableRow>
        ))}
      </Section>
      <Section title="Invoices" empty="No invoices.">
        {invoices.map((i) => (
          <TableRow key={i.id}>
            <TableCell><Link className="hover:underline" to={`/invoices/${i.id}`}>{i.invoiceNumber}</Link></TableCell>
            <TableCell>{formatDate(i.dueDate)}</TableCell>
            <TableCell><StatusBadge value={i.paymentStatus} /></TableCell>
            <TableCell className="text-right">{formatMoney(i.total, currency)}</TableCell>
          </TableRow>
        ))}
      </Section>
      <Section title="Payments" empty="No payments.">
        {payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{formatDate(p.date)}</TableCell>
            <TableCell>{p.method.replace("_", " ")}</TableCell>
            <TableCell>{p.reference || "—"}</TableCell>
            <TableCell className="text-right">{formatMoney(p.amount, currency)}</TableCell>
          </TableRow>
        ))}
      </Section>
      <Section title="Appointments" empty="No appointments.">
        {appointments.map((a) => (
          <TableRow key={a.id}>
            <TableCell>{a.title}</TableCell>
            <TableCell>{a.date} {a.startTime}</TableCell>
            <TableCell><StatusBadge value={a.status} /></TableCell>
            <TableCell />
          </TableRow>
        ))}
      </Section>
      <Section title="Tasks" empty="No tasks.">
        {tasks.map((t) => (
          <TableRow key={t.id}>
            <TableCell>{t.title}</TableCell>
            <TableCell>{t.dueDate || "—"}</TableCell>
            <TableCell><StatusBadge value={t.status} /></TableCell>
            <TableCell><StatusBadge value={t.priority} /></TableCell>
          </TableRow>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  return (
    <Card className="mb-4">
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {list.filter(Boolean).length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{children}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
