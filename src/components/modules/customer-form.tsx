import { Field } from "@/components/shared/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CustomerStatus } from "@/types";

export type CustomerFormValue = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  tags: string;
  status: CustomerStatus;
};

export function emptyCustomer(): CustomerFormValue {
  return { name: "", company: "", email: "", phone: "", address: "", notes: "", tags: "", status: "lead" };
}

export function CustomerForm({
  value,
  onChange,
  errors,
}: {
  value: CustomerFormValue;
  onChange: (v: CustomerFormValue) => void;
  errors: Record<string, string>;
}) {
  const set = (patch: Partial<CustomerFormValue>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Name" htmlFor="cus-name" error={errors.name}>
        <Input id="cus-name" value={value.name} onChange={(e) => set({ name: e.target.value })} required />
      </Field>
      <Field label="Company" htmlFor="cus-company">
        <Input id="cus-company" value={value.company} onChange={(e) => set({ company: e.target.value })} />
      </Field>
      <Field label="Email" htmlFor="cus-email" error={errors.email}>
        <Input id="cus-email" type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} />
      </Field>
      <Field label="Phone" htmlFor="cus-phone">
        <Input id="cus-phone" value={value.phone} onChange={(e) => set({ phone: e.target.value })} />
      </Field>
      <Field label="Address" htmlFor="cus-address" className="sm:col-span-2">
        <Input id="cus-address" value={value.address} onChange={(e) => set({ address: e.target.value })} />
      </Field>
      <Field label="Status" htmlFor="cus-status">
        <Select value={value.status} onValueChange={(v) => set({ status: v as CustomerStatus })}>
          <SelectTrigger id="cus-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Tags" htmlFor="cus-tags">
        <Input id="cus-tags" value={value.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="comma separated" />
      </Field>
      <Field label="Notes" htmlFor="cus-notes" className="sm:col-span-2">
        <Textarea id="cus-notes" value={value.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
    </div>
  );
}
