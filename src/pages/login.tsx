import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/shared/field";
import { useStore } from "@/lib/store";
import { useTheme } from "@/hooks/useTheme";

export function LoginPage() {
  const { setupNeeded, completeSetup, login, ready } = useStore();
  useTheme("system");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (setupNeeded) {
        if (password !== confirm) {
          setError("Passwords do not match.");
          return;
        }
        const result = await completeSetup({ username, displayName, password, businessName });
        if (!result.ok) setError(result.error);
      } else {
        const result = await login(username, password);
        if (!result.ok) setError(result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            IN
          </div>
          <CardTitle>{setupNeeded ? "Create your owner account" : "Sign in to Inpolio"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {setupNeeded
              ? "Inpolio stays on this device. Choose a username and password to protect your data."
              : "Use the username and password for this browser workspace."}
          </p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={(e) => void onSubmit(e)}>
            {setupNeeded ? (
              <Field label="Business name" htmlFor="login-biz">
                <Input id="login-biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="My business" autoComplete="organization" />
              </Field>
            ) : null}
            <Field label="Username" htmlFor="login-user">
              <Input
                id="login-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </Field>
            {setupNeeded ? (
              <Field label="Display name" htmlFor="login-display">
                <Input id="login-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" placeholder="Optional" />
              </Field>
            ) : null}
            <Field label="Password" htmlFor="login-pass">
              <Input
                id="login-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={setupNeeded ? "new-password" : "current-password"}
                required
              />
            </Field>
            {setupNeeded ? (
              <Field label="Confirm password" htmlFor="login-confirm">
                <Input
                  id="login-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={busy}>
              {busy ? "Please wait…" : setupNeeded ? "Create account" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
