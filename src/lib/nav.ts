import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/crm", label: "CRM", icon: Briefcase },
  { to: "/sales", label: "Sales", icon: CircleDollarSign },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/payments", label: "Payments", icon: Receipt },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/appointments", label: "Appointments", icon: Calendar },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/automations", label: "Automations", icon: Workflow },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/assistant", label: "Assistant", icon: Building2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export { Bell };
