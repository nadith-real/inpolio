import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore } from "@/lib/store";
import { formatDate, formatMoney } from "@/lib/utils";

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, saveOrder } = useStore();
  const order = data.orders.find((o) => o.id === id);
  const currency = data.settings.currency;
  if (!order) {
    return (
      <div>
        <p className="text-sm">Order not found.</p>
        <Button className="mt-2" variant="outline" onClick={() => navigate("/orders")}>Back</Button>
      </div>
    );
  }
  const customer = data.customers.find((c) => c.id === order.customerId);

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description={customer?.name ?? "Unknown customer"}
        actions={
          <div className="flex gap-2">
            {order.status !== "completed" ? (
              <Button onClick={() => saveOrder({ ...order, status: "completed" }, order)}>Mark completed</Button>
            ) : null}
            <Button variant="outline" asChild><Link to="/orders">All orders</Link></Button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge value={order.status} />
        <StatusBadge value={order.paymentStatus} />
        <span className="text-sm text-muted-foreground">{formatDate(order.date)}</span>
      </div>
      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Line</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatMoney(item.unitPrice, currency)}</TableCell>
                  <TableCell className="text-right">{formatMoney(item.quantity * item.unitPrice, currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 space-y-1 text-sm">
            <p>Subtotal {formatMoney(order.subtotal, currency)}</p>
            <p>Discount {formatMoney(order.discount, currency)}</p>
            <p>Tax {formatMoney(order.tax, currency)}</p>
            <p className="font-medium">Total {formatMoney(order.total, currency)}</p>
          </div>
          {order.notes ? <p className="mt-3 text-sm text-muted-foreground">{order.notes}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
