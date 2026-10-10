import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/components/shared/field";
import { useStore } from "@/lib/store";
import { createId, formatMoney, nowIso } from "@/lib/utils";
import type { Lead, LeadStage } from "@/types";

const STAGES: LeadStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"];
const LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

const emptyLead = (): Omit<Lead, "id" | "createdAt"> => ({
  name: "",
  company: "",
  contact: "",
  email: "",
  phone: "",
  potentialValue: 0,
  source: "",
  stage: "new",
  notes: "",
  nextFollowUp: "",
});

export function CrmPage() {
  const { data, upsert } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyLead());
  const [error, setError] = useState("");
  const currency = data.settings.currency;

  const save = () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    upsert("leads", { ...form, id: createId(), createdAt: nowIso(), name: form.name.trim() });
    setOpen(false);
    setForm(emptyLead());
    setError("");
  };

  const move = (lead: Lead, stage: LeadStage) => upsert("leads", { ...lead, stage });

  return (
    <div>
      <PageHeader
        title="CRM"
        description="Sales pipeline. Drag is not required — use stage buttons to move leads."
        actions={<Button onClick={() => setOpen(true)}><Plus /> New lead</Button>}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {STAGES.map((stage) => {
          const leads = data.leads.filter((l) => l.stage === stage);
          return (
            <div key={stage} className="min-h-40 rounded-lg border bg-muted/30 p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide">{LABELS[stage]}</p>
                <span className="text-xs text-muted-foreground">{leads.length}</span>
              </div>
              <div className="space-y-2">
                {leads.map((lead) => (
                  <Card key={lead.id}>
                    <CardContent className="space-y-1 p-3">
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.company || lead.contact || "No company"}</p>
                      <p className="text-xs">{formatMoney(lead.potentialValue, currency)}</p>
                      {lead.nextFollowUp ? <p className="text-[11px] text-muted-foreground">Follow-up {lead.nextFollowUp}</p> : null}
                      {lead.isDemo ? <p className="text-[10px] uppercase text-muted-foreground">Demo</p> : null}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {STAGES.filter((s) => s !== stage).map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="rounded border px-1.5 py-0.5 text-[10px] hover:bg-accent"
                            onClick={() => move(lead, s)}
                          >
                            {LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="lead-name" error={error}>
              <Input id="lead-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Company" htmlFor="lead-co">
              <Input id="lead-co" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </Field>
            <Field label="Contact" htmlFor="lead-contact">
              <Input id="lead-contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </Field>
            <Field label="Source" htmlFor="lead-source">
              <Input id="lead-source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </Field>
            <Field label="Email" htmlFor="lead-email">
              <Input id="lead-email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone" htmlFor="lead-phone">
              <Input id="lead-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Potential value" htmlFor="lead-val">
              <Input id="lead-val" type="number" min={0} value={form.potentialValue} onChange={(e) => setForm({ ...form, potentialValue: Number(e.target.value) })} />
            </Field>
            <Field label="Stage">
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v as LeadStage })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Next follow-up" htmlFor="lead-fu">
              <Input id="lead-fu" type="date" value={form.nextFollowUp} onChange={(e) => setForm({ ...form, nextFollowUp: e.target.value })} />
            </Field>
            <Field label="Notes" className="sm:col-span-2" htmlFor="lead-notes">
              <Textarea id="lead-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
