import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/pages/dashboard";
import { CustomersPage } from "@/pages/customers";
import { CustomerDetailPage } from "@/pages/customer-detail";
import { CrmPage } from "@/pages/crm";
import { SalesPage } from "@/pages/sales";
import { OrdersPage } from "@/pages/orders";
import { OrderDetailPage } from "@/pages/order-detail";
import { InvoicesPage } from "@/pages/invoices";
import { InvoiceDetailPage } from "@/pages/invoice-detail";
import { PaymentsPage } from "@/pages/payments";
import { InventoryPage } from "@/pages/inventory";
import { SuppliersPage } from "@/pages/suppliers";
import { AppointmentsPage } from "@/pages/appointments";
import { TasksPage } from "@/pages/tasks";
import { AutomationsPage } from "@/pages/automations";
import { AnalyticsPage } from "@/pages/analytics";
import { AssistantPage } from "@/pages/assistant";
import { SettingsPage } from "@/pages/settings";

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/crm" element={<CrmPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <Toaster richColors position="bottom-right" />
    </>
  );
}
