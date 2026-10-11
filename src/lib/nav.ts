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
  Shield,
  ShoppingCart,
  Truck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/types";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
};

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { to: "/customers", label: "Customers", icon: Users, permission: "customers" },
  { to: "/crm", label: "CRM", icon: Briefcase, permission: "crm" },
  { to: "/sales", label: "Sales", icon: CircleDollarSign, permission: "sales" },
  { to: "/orders", label: "Orders", icon: ShoppingCart, permission: "orders" },
  { to: "/invoices", label: "Invoices", icon: FileText, permission: "invoices" },
  { to: "/payments", label: "Payments", icon: Receipt, permission: "payments" },
  { to: "/inventory", label: "Inventory", icon: Package, permission: "inventory" },
  { to: "/suppliers", label: "Suppliers", icon: Truck, permission: "suppliers" },
  { to: "/appointments", label: "Appointments", icon: Calendar, permission: "appointments" },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, permission: "tasks" },
  { to: "/automations", label: "Automations", icon: Workflow, permission: "automations" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics" },
  { to: "/assistant", label: "Assistant", icon: Building2, permission: "assistant" },
  { to: "/admin", label: "Admin", icon: Shield, permission: "admin" },
  { to: "/settings", label: "Settings", icon: Settings, permission: "settings" },
];

export function navFor(can: (permission: Permission) => boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => item.to === "/settings" || can(item.permission));
}

export function firstAllowedPath(can: (permission: Permission) => boolean): string {
  return navFor(can)[0]?.to ?? "/no-access";
}

export function permissionForPath(pathname: string): Permission | null {
  if (pathname === "/no-access" || pathname === "/settings") return null;
  const exact = NAV_ITEMS.find((item) => item.to === pathname);
  if (exact) return exact.permission;
  const prefix = NAV_ITEMS.find((item) => item.to !== "/" && pathname.startsWith(`${item.to}/`));
  return prefix?.permission ?? null;
}

export { Bell };
