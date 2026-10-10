import { useMemo, useState } from "react";
import { CheckSquare, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty";
import { useStore } from "@/lib/store";
import { createId, todayIsoDate } from "@/lib/utils";
import type { Task, TaskPriority, TaskStatus } from "@/types";

const empty = (): Omit<Task, "id" | "isDemo"> => ({
  title: "",
  description: "",
  dueDate: todayIsoDate(),
  priority: "medium",
  status: "todo",
  customerId: "",
  orderId: "",
});

export function TasksPage() {
  const { data, upsert, remove } = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(empty());
  const [error, setError] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const today = todayIsoDate();
  const name = (id: string) => data.customers.find((c) => c.id === id)?.name ?? "";
  const orderNo = (id: string) => data.orders.find((o) => o.id === id)?.orderNumber ?? "";

  const groups = useMemo(() => {
    const openTasks = data.tasks.filter((t) => t.status !== "completed");
    return {
      today: openTasks.filter((t) => t.dueDate === today),
      upcoming: openTasks.filter((t) => t.dueDate > today),
      overdue: openTasks.filter((t) => t.dueDate && t.dueDate < today),
      completed: data.tasks.filter((t) => t.status === "completed"),
    };
  }, [data.tasks, today]);

  const save = () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    upsert("tasks", { ...form, id: editing?.id ?? createId(), title: form.title.trim(), isDemo: editing?.isDemo });
    setOpen(false);
  };

  const table = (items: Task[]) =>
    items.length === 0 ? (
      <p className="text-sm text-muted-foreground">Nothing here.</p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {[name(t.customerId), orderNo(t.orderId)].filter(Boolean).join(" · ")}
                </p>
              </TableCell>
              <TableCell>{t.dueDate || "—"}</TableCell>
              <TableCell><StatusBadge value={t.priority} /></TableCell>
              <TableCell><StatusBadge value={t.status} /></TableCell>
              <TableCell className="text-right">
                {t.status !== "completed" ? (
                  <Button variant="ghost" size="sm" onClick={() => upsert("tasks", { ...t, status: "completed" })}>
                    Complete
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditing(t);
                  setForm({ title: t.title, description: t.description, dueDate: t.dueDate, priority: t.priority, status: t.status, customerId: t.customerId, orderId: t.orderId });
                  setError("");
                  setOpen(true);
                }}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => setDelId(t.id)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Work queue grouped by due date."
        actions={<Button onClick={() => { setEditing(null); setForm(empty()); setError(""); setOpen(true); }}><Plus /> New task</Button>}
      />
      {data.tasks.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks" description="Create a task or let automations generate follow-ups." />
      ) : (
        <Tabs defaultValue="today">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="today">Today ({groups.today.length})</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming ({groups.upcoming.length})</TabsTrigger>
            <TabsTrigger value="overdue">Overdue ({groups.overdue.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({groups.completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="today">{table(groups.today)}</TabsContent>
          <TabsContent value="upcoming">{table(groups.upcoming)}</TabsContent>
          <TabsContent value="overdue">{table(groups.overdue)}</TabsContent>
          <TabsContent value="completed">{table(groups.completed)}</TabsContent>
        </Tabs>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" htmlFor="tsk-title" error={error} className="sm:col-span-2">
              <Input id="tsk-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Due date" htmlFor="tsk-due">
              <Input id="tsk-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Related customer">
              <Select value={form.customerId || "__none"} onValueChange={(v) => setForm({ ...form, customerId: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {data.customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Related order" className="sm:col-span-2">
              <Select value={form.orderId || "__none"} onValueChange={(v) => setForm({ ...form, orderId: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {data.orders.map((o) => <SelectItem key={o.id} value={o.id}>{o.orderNumber}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description" className="sm:col-span-2" htmlFor="tsk-desc">
              <Textarea id="tsk-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete task?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (delId) remove("tasks", delId); setDelId(null); }}
      />
    </div>
  );
}
