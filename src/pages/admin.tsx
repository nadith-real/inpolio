import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Field } from "@/components/shared/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { ALL_PERMISSIONS, PERMISSION_LABELS, OWNER_ROLE_ID } from "@/lib/auth/permissions";
import { formatDateTime } from "@/lib/utils";
import type { Permission, Role, User } from "@/types";

export function AdminPage() {
  const {
    root,
    user,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    createUser,
    updateUser,
    setUserPassword,
    deleteUser,
    createRole,
    updateRole,
    deleteRole,
  } = useStore();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Admin" description="Businesses, users and roles for this local workspace." />
      <Tabs defaultValue="businesses">
        <TabsList>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="businesses">
          <BusinessesTab
            businesses={root.businesses}
            onCreate={createBusiness}
            onUpdate={updateBusiness}
            onDelete={deleteBusiness}
          />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab
            users={root.users}
            roles={root.roles}
            businesses={root.businesses}
            currentUserId={user?.id}
            onCreate={createUser}
            onUpdate={updateUser}
            onPassword={setUserPassword}
            onDelete={deleteUser}
          />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab roles={root.roles} users={root.users} onCreate={createRole} onUpdate={updateRole} onDelete={deleteRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BusinessesTab({
  businesses,
  onCreate,
  onUpdate,
  onDelete,
}: {
  businesses: { id: string; name: string; createdAt: string }[];
  onCreate: (name: string) => { ok: true; id?: string } | { ok: false; error: string };
  onUpdate: (id: string, name: string) => { ok: true } | { ok: false; error: string };
  onDelete: (id: string) => { ok: true } | { ok: false; error: string };
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const add = () => {
    const result = onCreate(name);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setName("");
    toast.success("Business created.");
  };

  const saveEdit = () => {
    if (!editing) return;
    const result = onUpdate(editing.id, editing.name);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setEditing(null);
    toast.success("Business updated.");
  };

  return (
    <Card>
      <CardHeader><CardTitle>Businesses</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="New business name" />
          <Button onClick={add}>Add business</Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {businesses.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">{b.name}</TableCell>
                <TableCell>{formatDateTime(b.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ id: b.id, name: b.name })}>Rename</Button>
                  <Button variant="ghost" size="sm" onClick={() => setDelId(b.id)} disabled={businesses.length <= 1}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename business</DialogTitle></DialogHeader>
          <Field label="Name" htmlFor="biz-rename">
            <Input id="biz-rename" value={editing?.name ?? ""} onChange={(e) => setEditing((prev) => prev ? { ...prev, name: e.target.value } : prev)} />
          </Field>
          <Button onClick={saveEdit}>Save</Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete business?"
        description="All records in this business will be removed from this browser."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!delId) return;
          const result = onDelete(delId);
          setDelId(null);
          if (!result.ok) toast.error(result.error);
          else toast.success("Business deleted.");
        }}
      />
    </Card>
  );
}

function UsersTab({
  users,
  roles,
  businesses,
  currentUserId,
  onCreate,
  onUpdate,
  onPassword,
  onDelete,
}: {
  users: User[];
  roles: Role[];
  businesses: { id: string; name: string }[];
  currentUserId?: string;
  onCreate: (input: { username: string; displayName: string; password: string; roleId: string; businessIds: string[]; active?: boolean }) => Promise<{ ok: true } | { ok: false; error: string }>;
  onUpdate: (id: string, patch: { displayName?: string; roleId?: string; businessIds?: string[]; active?: boolean }) => { ok: true } | { ok: false; error: string };
  onPassword: (id: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onDelete: (id: string) => { ok: true } | { ok: false; error: string };
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    password: "",
    roleId: roles.find((r) => r.id !== OWNER_ROLE_ID)?.id ?? roles[0]?.id ?? "",
    businessIds: businesses.map((b) => b.id),
    active: true,
  });

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  const save = async () => {
    if (editing) {
      const result = onUpdate(editing.id, {
        displayName: form.displayName,
        roleId: form.roleId,
        businessIds: form.businessIds,
        active: form.active,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User updated.");
    } else {
      const result = await onCreate(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User created.");
    }
    setOpen(false);
    setEditing(null);
  };

  const savePassword = async () => {
    if (!passwordUser) return;
    const result = await onPassword(passwordUser.id, newPassword);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Password updated.");
    setPasswordUser(null);
    setNewPassword("");
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Users</CardTitle>
        <Button onClick={() => {
          setEditing(null);
          setForm({
            username: "",
            displayName: "",
            password: "",
            roleId: roles.find((r) => r.id !== OWNER_ROLE_ID)?.id ?? roles[0]?.id ?? "",
            businessIds: businesses.map((b) => b.id),
            active: true,
          });
          setOpen(true);
        }}>Add user</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Businesses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.displayName}</div>
                  <div className="text-xs text-muted-foreground">{u.username}</div>
                </TableCell>
                <TableCell>{roleName(u.roleId)}</TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  {u.roleId === OWNER_ROLE_ID
                    ? "All"
                    : u.businessIds.map((id) => businesses.find((b) => b.id === id)?.name ?? id).join(", ") || "None"}
                </TableCell>
                <TableCell>
                  <Badge variant={u.active ? "success" : "danger"}>{u.active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditing(u);
                    setForm({
                      username: u.username,
                      displayName: u.displayName,
                      password: "",
                      roleId: u.roleId,
                      businessIds: u.businessIds,
                      active: u.active,
                    });
                    setOpen(true);
                  }}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => { setPasswordUser(u); setNewPassword(""); }}>Password</Button>
                  <Button variant="ghost" size="sm" disabled={u.id === currentUserId} onClick={() => setDelId(u.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {!editing ? (
              <Field label="Username" htmlFor="user-username">
                <Input id="user-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </Field>
            ) : null}
            <Field label="Display name" htmlFor="user-display">
              <Input id="user-display" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </Field>
            {!editing ? (
              <Field label="Password" htmlFor="user-pass">
                <Input id="user-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
            ) : null}
            <Field label="Role">
              <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {form.roleId !== OWNER_ROLE_ID ? (
              <div className="grid gap-1.5">
                <p className="text-sm font-medium">Business access</p>
                {businesses.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.businessIds.includes(b.id)}
                      onCheckedChange={(v) => {
                        const on = v === true;
                        setForm({
                          ...form,
                          businessIds: on ? [...form.businessIds, b.id] : form.businessIds.filter((id) => id !== b.id),
                        });
                      }}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Owners can access every business.</p>
            )}
            {editing ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v === true })} />
                Active
              </label>
            ) : null}
            <Button onClick={() => void save()}>{editing ? "Save" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!passwordUser} onOpenChange={(o) => !o && setPasswordUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set password</DialogTitle></DialogHeader>
          <Field label="New password" htmlFor="set-pass">
            <Input id="set-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Button onClick={() => void savePassword()}>Update password</Button>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete user?"
        description="This account will no longer be able to sign in."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!delId) return;
          const result = onDelete(delId);
          setDelId(null);
          if (!result.ok) toast.error(result.error);
          else toast.success("User deleted.");
        }}
      />
    </Card>
  );
}

function RolesTab({
  roles,
  users,
  onCreate,
  onUpdate,
  onDelete,
}: {
  roles: Role[];
  users: User[];
  onCreate: (input: { name: string; description: string; permissions: Permission[] }) => { ok: true } | { ok: false; error: string };
  onUpdate: (id: string, patch: { name?: string; description?: string; permissions?: Permission[] }) => { ok: true } | { ok: false; error: string };
  onDelete: (id: string) => { ok: true } | { ok: false; error: string };
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissions: [] as Permission[] });

  const used = useMemo(() => {
    const map = new Map<string, number>();
    for (const u of users) map.set(u.roleId, (map.get(u.roleId) ?? 0) + 1);
    return map;
  }, [users]);

  const toggle = (p: Permission) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(p) ? prev.permissions.filter((x) => x !== p) : [...prev.permissions, p],
    }));
  };

  const save = () => {
    if (editing) {
      const result = onUpdate(editing.id, form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Role updated.");
    } else {
      const result = onCreate(form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Role created.");
    }
    setOpen(false);
    setEditing(null);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Roles</CardTitle>
        <Button onClick={() => {
          setEditing(null);
          setForm({ name: "", description: "", permissions: ["dashboard", "write"] });
          setOpen(true);
        }}>Add role</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {roles.map((r) => (
          <div key={r.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">{r.name} {r.isSystem ? <Badge>System</Badge> : null}</p>
                <p className="text-sm text-muted-foreground">{r.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">{used.get(r.id) ?? 0} user(s)</p>
              </div>
              <div>
                <Button variant="ghost" size="sm" disabled={r.id === OWNER_ROLE_ID} onClick={() => {
                  setEditing(r);
                  setForm({ name: r.name, description: r.description, permissions: [...r.permissions] });
                  setOpen(true);
                }}>Edit</Button>
                <Button variant="ghost" size="sm" disabled={r.isSystem} onClick={() => setDelId(r.id)}>Delete</Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {r.permissions.map((p) => PERMISSION_LABELS[p]).join(" · ")}
            </p>
          </div>
        ))}
      </CardContent>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit role" : "Add role"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Name" htmlFor="role-name">
              <Input id="role-name" value={form.name} disabled={!!editing?.isSystem} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Description" htmlFor="role-desc">
              <Textarea id="role-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Permissions</p>
              {ALL_PERMISSIONS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.permissions.includes(p)} onCheckedChange={() => toggle(p)} />
                  {PERMISSION_LABELS[p]}
                </label>
              ))}
            </div>
            <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete role?"
        description="Users must be reassigned before a role can be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!delId) return;
          const result = onDelete(delId);
          setDelId(null);
          if (!result.ok) toast.error(result.error);
          else toast.success("Role deleted.");
        }}
      />
    </Card>
  );
}
