import { useState } from "react";
import { Plus, Workflow } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty";
import { WriteGate } from "@/components/auth/write-gate";
import { useStore } from "@/lib/store";
import { createId, nowIso } from "@/lib/utils";
import type { Automation, AutomationAction, AutomationTrigger } from "@/types";

const TRIGGERS: { id: AutomationTrigger; label: string }[] = [
  { id: "invoice.overdue", label: "WHEN invoice is overdue" },
  { id: "stock.below_threshold", label: "WHEN stock is below threshold" },
  { id: "order.completed", label: "WHEN order is completed" },
  { id: "invoice.created", label: "WHEN invoice is created" },
  { id: "payment.received", label: "WHEN payment is received" },
  { id: "task.overdue", label: "WHEN task is overdue" },
  { id: "appointment.upcoming", label: "WHEN appointment is upcoming" },
];

export function AutomationsPage() {
  const { data, upsert, remove } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger: "invoice.overdue" as AutomationTrigger,
    action: "create_task" as AutomationAction,
    actionTitle: "",
    actionBody: "",
  });
  const [error, setError] = useState("");
  const [delId, setDelId] = useState<string | null>(null);

  const save = () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    const record: Automation = {
      id: createId(),
      name: form.name.trim(),
      enabled: true,
      trigger: form.trigger,
      action: form.action,
      actionTitle: form.actionTitle.trim() || form.name.trim(),
      actionBody: form.actionBody.trim(),
      createdAt: nowIso(),
    };
    upsert("automations", record);
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Automations"
        description="Local WHEN → THEN rules. They run whenever data changes — no internet required."
        actions={
          <WriteGate>
            <Button onClick={() => { setForm({ name: "", trigger: "invoice.overdue", action: "create_task", actionTitle: "", actionBody: "" }); setError(""); setOpen(true); }}><Plus /> New automation</Button>
          </WriteGate>
        }
      />
      {data.automations.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No automations"
          description="Example: WHEN invoice is overdue THEN create a follow-up task."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.automations.map((auto) => (
            <Card key={auto.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{auto.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {TRIGGERS.find((t) => t.id === auto.trigger)?.label} → {auto.action === "create_task" ? "create task" : "create notification"}
                  </p>
                  <p className="text-xs text-muted-foreground">{auto.actionTitle}</p>
                  {auto.isDemo ? <p className="mt-1 text-[10px] uppercase text-muted-foreground">Demo</p> : null}
                </div>
                <WriteGate>
                  <div className="flex items-center gap-2">
                    <Switch checked={auto.enabled} onCheckedChange={(v) => upsert("automations", { ...auto, enabled: v })} aria-label="Enable automation" />
                    <Button variant="ghost" size="sm" onClick={() => setDelId(auto.id)}>Delete</Button>
                  </div>
                </WriteGate>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New automation</DialogTitle></DialogHeader>
          <Field label="Name" htmlFor="auto-name" error={error}>
            <Input id="auto-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="WHEN">
            <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v as AutomationTrigger })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="THEN">
            <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v as AutomationAction })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="create_task">Create task</SelectItem>
                <SelectItem value="create_notification">Create notification</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Title" htmlFor="auto-title">
            <Input id="auto-title" value={form.actionTitle} onChange={(e) => setForm({ ...form, actionTitle: e.target.value })} />
          </Field>
          <Field label="Details" htmlFor="auto-body">
            <Textarea id="auto-body" value={form.actionBody} onChange={(e) => setForm({ ...form, actionBody: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete automation?"
        description="Existing tasks created by this rule are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (delId) remove("automations", delId); setDelId(null); }}
      />
    </div>
  );
}
