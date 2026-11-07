import {
  BarChart3,
  Bell,
  Briefcase,
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
  Sparkles,
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

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" }],
  },
  {
    id: "business",
    label: "Business",
    items: [
      { to: "/customers", label: "Customers", icon: Users, permission: "customers" },
      { to: "/crm", label: "CRM", icon: Briefcase, permission: "crm" },
      { to: "/sales", label: "Sales", icon: CircleDollarSign, permission: "sales" },
      { to: "/orders", label: "Orders", icon: ShoppingCart, permission: "orders" },
      { to: "/invoices", label: "Invoices", icon: FileText, permission: "invoices" },
      { to: "/payments", label: "Payments", icon: Receipt, permission: "payments" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      { to: "/inventory", label: "Inventory", icon: Package, permission: "inventory" },
      { to: "/suppliers", label: "Suppliers", icon: Truck, permission: "suppliers" },
      { to: "/appointments", label: "Appointments", icon: Calendar, permission: "appointments" },
      { to: "/tasks", label: "Tasks", icon: CheckSquare, permission: "tasks" },
      { to: "/automations", label: "Automations", icon: Workflow, permission: "automations" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { to: "/analytics", label: "Analytics", icon: BarChart3, permission: "analytics" },
      { to: "/assistant", label: "Assistant", icon: Sparkles, permission: "assistant" },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { to: "/admin", label: "Admin", icon: Shield, permission: "admin" },
      { to: "/settings", label: "Settings", icon: Settings, permission: "settings" },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function navGroupsFor(can: (permission: Permission) => boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.to === "/settings" || can(item.permission)),
  })).filter((group) => group.items.length > 0);
}

export function navFor(can: (permission: Permission) => boolean): NavItem[] {
  return navGroupsFor(can).flatMap((group) => group.items);
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
