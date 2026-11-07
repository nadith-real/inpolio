import { ShieldOff } from "lucide-react";

export function NoAccessPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <ShieldOff className="h-5 w-5" />
      </div>
      <h1 className="text-lg font-semibold tracking-tight">No access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This account has no pages assigned. Ask an owner or admin to update your role.
      </p>
    </div>
  );
}
