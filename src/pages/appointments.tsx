import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
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
import { WriteGate } from "@/components/auth/write-gate";
import { useStore } from "@/lib/store";
import { createId, todayIsoDate } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/types";

const STATUSES: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no-show"];

const empty = (): Omit<Appointment, "id" | "isDemo"> => ({
  customerId: "",
  title: "",
  date: todayIsoDate(),
  startTime: "09:00",
  endTime: "10:00",
  status: "scheduled",
  notes: "",
});

function monthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export function AppointmentsPage() {
  const { data, upsert, remove } = useStore();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(empty());
  const [error, setError] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const name = (id: string) => data.customers.find((c) => c.id === id)?.name ?? "—";
  const today = todayIsoDate();

  const cells = useMemo(() => monthDays(cursor.y, cursor.m), [cursor]);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleString(undefined, { month: "long", year: "numeric" });

  const save = () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (form.startTime && form.endTime && form.endTime <= form.startTime) { setError("End time must be after start time."); return; }
    upsert("appointments", { ...form, id: editing?.id ?? createId(), title: form.title.trim(), isDemo: editing?.isDemo });
    setOpen(false);
  };

  const reminder = (a: Appointment) => {
    if (["cancelled", "completed", "no-show"].includes(a.status)) return null;
    if (a.date === today) return "Today";
    const t = new Date();
    t.setDate(t.getDate() + 1);
    if (a.date === todayIsoDate(t)) return "Tomorrow";
    return null;
  };

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Local calendar. Reminders appear as badges — no messaging APIs."
        actions={
          <WriteGate>
            <Button onClick={() => { setEditing(null); setForm(empty()); setError(""); setOpen(true); }}><Plus /> New appointment</Button>
          </WriteGate>
        }
      />
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <div className="mb-3 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCursor((c) => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })}>Prev</Button>
            <p className="text-sm font-medium">{monthLabel}</p>
            <Button variant="outline" size="sm" onClick={() => setCursor((c) => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })}>Next</Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              const iso = d ? `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : "";
              const items = d ? data.appointments.filter((a) => a.date === iso) : [];
              return (
                <div key={i} className="min-h-20 rounded-md border bg-card p-1 text-left">
                  <p className="text-xs text-muted-foreground">{d ?? ""}</p>
                  {items.map((a) => (
                    <button key={a.id} type="button" className="mt-0.5 block w-full truncate rounded bg-muted px-1 text-[11px]" onClick={() => {
                      setEditing(a);
                      setForm({ customerId: a.customerId, title: a.title, date: a.date, startTime: a.startTime, endTime: a.endTime, status: a.status, notes: a.notes });
                      setError("");
                      setOpen(true);
                    }}>
                      {a.startTime} {a.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value="list">
          {data.appointments.length === 0 ? (
            <EmptyState icon={CalendarIcon} title="No appointments" description="Schedule a meeting with a customer." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data.appointments].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {a.title}
                      {reminder(a) ? <span className="ml-2 text-[10px] uppercase text-amber-700">{reminder(a)}</span> : null}
                    </TableCell>
                    <TableCell>{name(a.customerId)}</TableCell>
                    <TableCell>{a.date} {a.startTime}–{a.endTime}</TableCell>
                    <TableCell><StatusBadge value={a.status} /></TableCell>
                    <TableCell className="text-right">
                      <WriteGate>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditing(a);
                          setForm({ customerId: a.customerId, title: a.title, date: a.date, startTime: a.startTime, endTime: a.endTime, status: a.status, notes: a.notes });
                          setError("");
                          setOpen(true);
                        }}>Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => setDelId(a.id)}>Delete</Button>
                      </WriteGate>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit appointment" : "New appointment"}</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" htmlFor="apt-title" error={error} className="sm:col-span-2">
              <Input id="apt-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Customer">
              <Select value={form.customerId || "__none"} onValueChange={(v) => setForm({ ...form, customerId: v === "__none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {data.customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AppointmentStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date" htmlFor="apt-date">
              <Input id="apt-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start" htmlFor="apt-start">
                <Input id="apt-start" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </Field>
              <Field label="End" htmlFor="apt-end">
                <Input id="apt-end" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes" className="sm:col-span-2" htmlFor="apt-notes">
              <Textarea id="apt-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
        title="Delete appointment?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (delId) remove("appointments", delId); setDelId(null); }}
      />
    </div>
  );
}
