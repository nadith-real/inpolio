import type { Permission, Role, User, WorkspaceRoot } from "@/types";
import { PERMISSIONS } from "@/types";

export const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

export const PERMISSION_LABELS: Record<Permission, string> = {
  dashboard: "Dashboard",
  customers: "Customers",
  crm: "CRM",
  sales: "Sales",
  orders: "Orders",
  invoices: "Invoices",
  payments: "Payments",
  inventory: "Inventory",
  suppliers: "Suppliers",
  appointments: "Appointments",
  tasks: "Tasks",
  automations: "Automations",
  analytics: "Analytics",
  assistant: "Assistant",
  settings: "Settings",
  admin: "Admin",
  write: "Create and edit records",
  export: "Export and import data",
};

export const OWNER_ROLE_ID = "role-owner";
export const ADMIN_ROLE_ID = "role-admin";
export const STAFF_ROLE_ID = "role-staff";

const STAFF_PERMISSIONS: Permission[] = [
  "dashboard",
  "customers",
  "crm",
  "sales",
  "orders",
  "invoices",
  "payments",
  "inventory",
  "suppliers",
  "appointments",
  "tasks",
  "assistant",
  "write",
];

export const DEFAULT_ROLES: Role[] = [
  {
    id: OWNER_ROLE_ID,
    name: "Owner",
    description: "Full access to every business, user and setting.",
    permissions: [...ALL_PERMISSIONS],
    isSystem: true,
  },
  {
    id: ADMIN_ROLE_ID,
    name: "Admin",
    description: "Manage users, roles and day-to-day operations.",
    permissions: [...ALL_PERMISSIONS],
    isSystem: true,
  },
  {
    id: STAFF_ROLE_ID,
    name: "Staff",
    description: "Work on customers, sales, inventory and tasks.",
    permissions: [...STAFF_PERMISSIONS],
    isSystem: true,
  },
];

export function isOwnerRole(roleId: string): boolean {
  return roleId === OWNER_ROLE_ID;
}

export function roleById(root: WorkspaceRoot, roleId: string): Role | undefined {
  return root.roles.find((r) => r.id === roleId);
}

export function permissionsFor(root: WorkspaceRoot, user: User | null | undefined): Permission[] {
  if (!user || !user.active) return [];
  if (isOwnerRole(user.roleId)) return [...ALL_PERMISSIONS];
  const role = roleById(root, user.roleId);
  if (!role) return [];
  return role.permissions.filter((p): p is Permission => (PERMISSIONS as readonly string[]).includes(p));
}

export function hasPermission(root: WorkspaceRoot, user: User | null | undefined, permission: Permission): boolean {
  return permissionsFor(root, user).includes(permission);
}

export function accessibleBusinessIds(root: WorkspaceRoot, user: User | null | undefined): string[] {
  if (!user || !user.active) return [];
  if (isOwnerRole(user.roleId)) return root.businesses.map((b) => b.id);
  const allowed = new Set(user.businessIds);
  return root.businesses.filter((b) => allowed.has(b.id)).map((b) => b.id);
}

export function ownerCount(root: WorkspaceRoot): number {
  return root.users.filter((u) => u.active && isOwnerRole(u.roleId)).length;
}
