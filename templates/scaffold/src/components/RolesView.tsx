import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface AdminRole {
  id: number;
  name: string;
  description: string;
  protected: boolean;
  userCount: number;
  permissions: string[];
}

interface Permission {
  code: string;
  description: string;
}

interface RolesViewProps {
  onError: (error: unknown, context: { action: string; source: string }) => void;
}

export function RolesView({ onError }: RolesViewProps) {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editing, setEditing] = useState<AdminRole | 'new' | null>(null);
  const [form, setForm] = useState<{ name: string; description: string; permissionCodes: string[] }>({
    name: '', description: '', permissionCodes: [],
  });

  const load = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([
        api.admin.listRoles() as Promise<AdminRole[]>,
        api.admin.listPermissions(),
      ]);
      setRoles(r);
      setPermissions(p);
    } catch (err) {
      onError(err, { action: 'Listar roles', source: 'RolesView.load' });
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (role: AdminRole | 'new') => {
    setEditing(role);
    setForm(role === 'new'
      ? { name: '', description: '', permissionCodes: [] }
      : { name: role.name, description: role.description, permissionCodes: role.permissions });
  };

  const togglePermission = (code: string) => {
    setForm((f) => ({
      ...f,
      permissionCodes: f.permissionCodes.includes(code)
        ? f.permissionCodes.filter((c) => c !== code)
        : [...f.permissionCodes, code],
    }));
  };

  const save = async () => {
    try {
      if (editing === 'new') await api.admin.createRole(form);
      else if (editing) await api.admin.updateRole(editing.id, form);
      setEditing(null);
      await load();
      toast.success('Rol guardado correctamente');
    } catch (err) {
      onError(err, { action: editing === 'new' ? 'Crear rol' : `Editar rol ${form.name}`, source: 'RolesView.save' });
    }
  };

  const remove = async (role: AdminRole) => {
    try {
      await api.admin.deleteRole(role.id);
      await load();
      toast.success(`Rol "${role.name}" borrado`);
    } catch (err) {
      onError(err, { action: `Borrar rol ${role.name}`, source: 'RolesView.remove' });
    }
  };

  const canManage = hasPermission('role.create') || hasPermission('role.edit');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
          {hasPermission('role.create') && (
            <CardAction>
              <Button onClick={() => openEdit('new')}>
                <Plus /> Crear rol
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Usuarios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-muted-foreground">{role.description || '—'}</TableCell>
                  <TableCell>{role.permissions.length}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell className="text-right">
                    {role.protected ? (
                      <Badge variant="outline">
                        <ShieldCheck /> protegido
                      </Badge>
                    ) : (
                      canManage && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(role)}>
                            <Pencil /> Editar
                          </Button>
                          {hasPermission('role.delete') && (
                            <Button size="sm" variant="destructive" onClick={() => remove(role)}>
                              <Trash2 /> Borrar
                            </Button>
                          )}
                        </div>
                      )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editing != null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing === 'new' ? 'Nuevo rol' : `Editar ${form.name}`}</DialogTitle></DialogHeader>
          <Label>Nombre</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Label>Descripción</Label>
          <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Label>Permisos</Label>
          <div className="max-h-64 overflow-y-auto">
            {permissions.map((p) => (
              <label key={p.code} className="flex items-center gap-2 py-1 text-sm">
                <Checkbox
                  checked={form.permissionCodes.includes(p.code)}
                  onCheckedChange={() => togglePermission(p.code)}
                />
                {p.code}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
