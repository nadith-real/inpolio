import { useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadJson } from "@/lib/export";
import { useStore } from "@/lib/store";
import type { Appearance } from "@/types";

const CURRENCIES = ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "SGD"];

export function SettingsPage() {
  const { data, updateSettings, loadDemo, removeDemo, clearAll, resetAll, importData } = useStore();
  const [confirm, setConfirm] = useState<"clear" | "reset" | "demo-remove" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = data.settings;

  const onImport = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const result = importData(text);
    if (result.ok) toast.success("Backup imported.");
    else toast.error(result.error);
  };

  const onLogo = async (file?: File) => {
    if (!file) return;
    if (file.size > 400_000) {
      toast.error("Logo must be under 400KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateSettings({ logo: String(reader.result ?? "") });
    reader.readAsDataURL(file);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Business profile, appearance and local data tools." />

      <Card className="mb-4">
        <CardHeader><CardTitle>Business</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Business name" htmlFor="set-name">
            <Input id="set-name" value={s.businessName} onChange={(e) => updateSettings({ businessName: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="set-email">
            <Input id="set-email" type="email" value={s.email} onChange={(e) => updateSettings({ email: e.target.value })} />
          </Field>
          <Field label="Phone" htmlFor="set-phone">
            <Input id="set-phone" value={s.phone} onChange={(e) => updateSettings({ phone: e.target.value })} />
          </Field>
          <Field label="Currency">
            <Select value={s.currency} onValueChange={(v) => updateSettings({ currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Default tax rate %" htmlFor="set-tax">
            <Input id="set-tax" type="number" min={0} step="0.01" value={s.taxRate} onChange={(e) => updateSettings({ taxRate: Number(e.target.value) })} />
          </Field>
          <Field label="Logo" htmlFor="set-logo">
            <Input id="set-logo" type="file" accept="image/*" onChange={(e) => void onLogo(e.target.files?.[0])} />
          </Field>
          <Field label="Address" className="sm:col-span-2" htmlFor="set-addr">
            <Textarea id="set-addr" value={s.address} onChange={(e) => updateSettings({ address: e.target.value })} />
          </Field>
          {s.logo ? (
            <div className="sm:col-span-2">
              <img src={s.logo} alt="Business logo" className="h-12 object-contain" />
              <Button variant="ghost" size="sm" onClick={() => updateSettings({ logo: "" })}>Remove logo</Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent>
          <Field label="Theme">
            <Select value={s.appearance} onValueChange={(v) => updateSettings({ appearance: v as Appearance })}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader><CardTitle>Demo data</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Optional sample records (10 customers, 8 products, 5 orders, invoices, payments, appointments, tasks and leads). Demo rows are labelled.
          </p>
          <p>Status: {data.meta.demoLoaded ? "Demo data is loaded" : "Demo data is not loaded"}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { loadDemo(); toast.success("Demo data loaded."); }}>Load demo data</Button>
            <Button variant="outline" disabled={!data.meta.demoLoaded} onClick={() => setConfirm("demo-remove")}>Remove demo data</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Everything lives in this browser&apos;s localStorage. Export regularly. Import replaces the current workspace.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadJson(data)}>Export JSON</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>Import JSON</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onImport(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => setConfirm("clear")}>Clear data</Button>
            <Button variant="destructive" onClick={() => setConfirm("reset")}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm === "clear"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Clear business data?"
        description="Customers, orders, invoices and related records will be removed. Settings are kept."
        confirmLabel="Clear data"
        destructive
        onConfirm={() => { clearAll(); setConfirm(null); toast.success("Data cleared."); }}
      />
      <ConfirmDialog
        open={confirm === "reset"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Reset Inpolio?"
        description="This removes all records and restores default settings."
        confirmLabel="Reset"
        destructive
        onConfirm={() => { resetAll(); setConfirm(null); toast.success("Workspace reset."); }}
      />
      <ConfirmDialog
        open={confirm === "demo-remove"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Remove demo data?"
        description="Only records marked as demo are deleted. Your own records stay."
        confirmLabel="Remove demo"
        destructive
        onConfirm={() => { removeDemo(); setConfirm(null); toast.success("Demo data removed."); }}
      />
    </div>
  );
}
