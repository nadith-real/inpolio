export type CustomerStatus = "lead" | "prospect" | "customer" | "inactive";

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type OrderStatus = "pending" | "confirmed" | "processing" | "completed" | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid" | "overdue";

export type PaymentMethod = "cash" | "bank_transfer" | "card" | "other";

export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no-show";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "todo" | "in_progress" | "completed";

export type Appearance = "light" | "dark" | "system";

export type LineItem = {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type Customer = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  tags: string[];
  status: CustomerStatus;
  createdAt: string;
  lastInteraction: string;
  totalSpent: number;
  isDemo?: boolean;
};

export type Lead = {
  id: string;
  name: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  potentialValue: number;
  source: string;
  stage: LeadStage;
  notes: string;
  nextFollowUp: string;
  createdAt: string;
  customerId?: string;
  isDemo?: boolean;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  supplierId: string;
  isDemo?: boolean;
};

export type Supplier = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  isDemo?: boolean;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  date: string;
  notes: string;
  inventoryApplied: boolean;
  isDemo?: boolean;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  orderId?: string;
  items: LineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  issueDate: string;
  dueDate: string;
  paymentStatus: PaymentStatus;
  notes: string;
  isDemo?: boolean;
};

export type Payment = {
  id: string;
  customerId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  reference: string;
  notes: string;
  isDemo?: boolean;
};

export type Appointment = {
  id: string;
  customerId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string;
  isDemo?: boolean;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  customerId: string;
  orderId: string;
  isDemo?: boolean;
};

export type AutomationTrigger =
  | "invoice.overdue"
  | "stock.below_threshold"
  | "order.completed"
  | "invoice.created"
  | "payment.received"
  | "task.overdue"
  | "appointment.upcoming";

export type AutomationAction = "create_task" | "create_notification";

export type Automation = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  action: AutomationAction;
  actionTitle: string;
  actionBody: string;
  createdAt: string;
  isDemo?: boolean;
};

export type NotificationType =
  | "overdue_invoice"
  | "low_stock"
  | "overdue_task"
  | "upcoming_appointment"
  | "new_order"
  | "automation";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
  relatedType?: string;
  signature: string;
};

export type BusinessSettings = {
  businessName: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
  appearance: Appearance;
};

export type AppData = {
  customers: Customer[];
  leads: Lead[];
  products: Product[];
  suppliers: Supplier[];
  orders: Order[];
  invoices: Invoice[];
  payments: Payment[];
  appointments: Appointment[];
  tasks: Task[];
  automations: Automation[];
  notifications: AppNotification[];
  settings: BusinessSettings;
  meta: { demoLoaded: boolean; version: number };
};

export type CollectionKey = Exclude<keyof AppData, "settings" | "meta">;

export type DashboardRange = "today" | "7d" | "30d" | "90d" | "year";

export const PERMISSIONS = [
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
  "automations",
  "analytics",
  "assistant",
  "settings",
  "admin",
  "write",
  "export",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type Role = {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
};

export type User = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleId: string;
  businessIds: string[];
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
};

export type Business = {
  id: string;
  name: string;
  createdAt: string;
};

export type Session = {
  userId: string;
  businessId: string;
};

export type WorkspaceRoot = {
  version: number;
  businesses: Business[];
  users: User[];
  roles: Role[];
  workspaces: Record<string, AppData>;
};
