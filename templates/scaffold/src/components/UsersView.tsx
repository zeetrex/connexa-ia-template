import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  active: boolean;
  roles: { id: number; name: string }[];
}

interface AdminRole {
  id: number;
  name: string;
}

interface UsersViewProps {
  onError: (error: unknown, context: { action: string; source: string }) => void;
}

export function UsersView({ onError }: UsersViewProps) {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([
        api.admin.listUsers() as Promise<AdminUser[]>,
        api.admin.listRoles() as Promise<AdminRole[]>,
      ]);
      setUsers(u);
      setRoles(r);
    } catch (err) {
      onError(err, { action: 'Listar usuarios', source: 'UsersView.load' });
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit = hasPermission('user.edit');

  const toggleActive = async (user: AdminUser) => {
    try {
      await api.admin.patchUser(user.id, { active: !user.active });
      await load();
    } catch (err) {
      onError(err, { action: `Cambiar estado de ${user.email}`, source: 'UsersView.toggleActive' });
    }
  };

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setSelectedRoleIds(user.roles.map((r) => r.id));
  };

  const toggleSelectedRole = (roleId: number) => {
    setSelectedRoleIds((ids) => (ids.includes(roleId) ? ids.filter((id) => id !== roleId) : [...ids, roleId]));
  };

  const saveRoles = async () => {
    if (!editing) return;
    try {
      await api.admin.patchUser(editing.id, { roleIds: selectedRoleIds });
      setEditing(null);
      await load();
      toast.success('Roles actualizados correctamente');
    } catch (err) {
      onError(err, { action: `Editar roles de ${editing.email}`, source: 'UsersView.saveRoles' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length > 0
                        ? u.roles.map((r) => <Badge key={r.id} variant="secondary">{r.name}</Badge>)
                        : '—'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={u.active} disabled={!canEdit} onCheckedChange={() => toggleActive(u)} />
                      <span className="text-muted-foreground text-sm">{u.active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                        <Pencil /> Editar roles
                      </Button>
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
          <DialogHeader>
            <DialogTitle>Roles de {editing?.email}</DialogTitle>
            <DialogDescription>Reemplaza el set completo de roles asignados.</DialogDescription>
          </DialogHeader>
          {roles.map((role) => (
            <label key={role.id} className="flex items-center gap-2 py-1 text-sm">
              <Checkbox
                checked={selectedRoleIds.includes(role.id)}
                onCheckedChange={() => toggleSelectedRole(role.id)}
              />
              {role.name}
            </label>
          ))}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveRoles}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
