export function NoAccessPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">No access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This account has no pages assigned. Ask an owner or admin to update your role.
      </p>
    </div>
  );
}
