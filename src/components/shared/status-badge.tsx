import { Badge } from "@/components/ui/badge";

const MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "outline" }> = {
  lead: { label: "Lead", variant: "info" },
  prospect: { label: "Prospect", variant: "warning" },
  customer: { label: "Customer", variant: "success" },
  inactive: { label: "Inactive", variant: "outline" },
  new: { label: "New", variant: "info" },
  contacted: { label: "Contacted", variant: "default" },
  qualified: { label: "Qualified", variant: "warning" },
  proposal: { label: "Proposal", variant: "info" },
  won: { label: "Won", variant: "success" },
  lost: { label: "Lost", variant: "danger" },
  pending: { label: "Pending", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "info" },
  processing: { label: "Processing", variant: "info" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "outline" },
  unpaid: { label: "Unpaid", variant: "warning" },
  partial: { label: "Partial", variant: "info" },
  paid: { label: "Paid", variant: "success" },
  overdue: { label: "Overdue", variant: "danger" },
  scheduled: { label: "Scheduled", variant: "info" },
  "no-show": { label: "No-show", variant: "danger" },
  todo: { label: "To do", variant: "outline" },
  in_progress: { label: "In progress", variant: "info" },
  low: { label: "Low", variant: "outline" },
  medium: { label: "Medium", variant: "default" },
  high: { label: "High", variant: "warning" },
  urgent: { label: "Urgent", variant: "danger" },
};

export function StatusBadge({ value }: { value: string }) {
  const item = MAP[value] ?? { label: value, variant: "outline" as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
