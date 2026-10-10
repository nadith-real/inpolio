import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { paidAmountForInvoice } from "@/lib/business";
import { useStore } from "@/lib/store";
import { formatDate, formatMoney } from "@/lib/utils";

export function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useStore();
  const invoice = data.invoices.find((i) => i.id === id);
  const currency = data.settings.currency;
  const settings = data.settings;
  if (!invoice) {
    return (
      <div>
        <p className="text-sm">Invoice not found.</p>
        <Button className="mt-2" variant="outline" onClick={() => navigate("/invoices")}>Back</Button>
      </div>
    );
  }
  const customer = data.customers.find((c) => c.id === invoice.customerId);
  const paid = paidAmountForInvoice(data.payments, invoice.id);
  const due = Math.max(0, invoice.total - paid);

  return (
    <div>
      <PageHeader
        title={invoice.invoiceNumber}
        description={customer?.name ?? "Unknown customer"}
        actions={
          <div className="flex gap-2 no-print">
            <Button onClick={() => window.print()}>Print / PDF</Button>
            <Button variant="outline" asChild><Link to="/invoices">All invoices</Link></Button>
          </div>
        }
      />
      <Card className="mx-auto max-w-3xl">
        <CardContent className="space-y-6 p-8">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              {settings.logo ? <img src={settings.logo} alt="" className="mb-2 h-12 object-contain" /> : null}
              <h2 className="text-lg font-semibold">{settings.businessName || "Inpolio"}</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{settings.address}</p>
              <p className="text-sm text-muted-foreground">{settings.email} {settings.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold">Invoice</p>
              <p className="text-sm">{invoice.invoiceNumber}</p>
              <div className="mt-1 flex justify-end"><StatusBadge value={invoice.paymentStatus} /></div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Bill to</p>
              <p className="font-medium">{customer?.name}</p>
              <p>{customer?.company}</p>
              <p>{customer?.address}</p>
              <p>{customer?.email}</p>
            </div>
            <div>
              <p>Issue date: {formatDate(invoice.issueDate)}</p>
              <p>Due date: {formatDate(invoice.dueDate)}</p>
              <p>Paid: {formatMoney(paid, currency)}</p>
              <p>Balance: {formatMoney(due, currency)}</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatMoney(item.unitPrice, currency)}</TableCell>
                  <TableCell className="text-right">{formatMoney(item.quantity * item.unitPrice, currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="ml-auto w-56 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(invoice.subtotal, currency)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>{formatMoney(invoice.discount, currency)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatMoney(invoice.tax, currency)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(invoice.total, currency)}</span></div>
          </div>
          {invoice.notes ? <p className="text-sm text-muted-foreground">{invoice.notes}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
