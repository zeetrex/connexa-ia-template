import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, CircleCheck, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface {{EXAMPLE_MODULE_NAME_PASCAL}}Item {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'done';
}

interface {{EXAMPLE_MODULE_NAME_PASCAL}}ViewProps {
  onError: (error: unknown, context: { action: string; source: string }) => void;
}

export function {{EXAMPLE_MODULE_NAME_PASCAL}}View({ onError }: {{EXAMPLE_MODULE_NAME_PASCAL}}ViewProps) {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<{{EXAMPLE_MODULE_NAME_PASCAL}}Item[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const load = useCallback(async () => {
    try {
      setItems((await api.{{EXAMPLE_MODULE_NAME}}.list()) as {{EXAMPLE_MODULE_NAME_PASCAL}}Item[]);
    } catch (err) {
      onError(err, { action: 'Listar {{EXAMPLE_MODULE_PATH}}', source: '{{EXAMPLE_MODULE_NAME_PASCAL}}View.load' });
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      await api.{{EXAMPLE_MODULE_NAME}}.create(form);
      setForm({ title: '', description: '' });
      setOpen(false);
      await load();
      toast.success('Creado correctamente');
    } catch (err) {
      onError(err, { action: 'Crear {{EXAMPLE_MODULE_NAME}}', source: '{{EXAMPLE_MODULE_NAME_PASCAL}}View.create' });
    }
  };

  const toggleStatus = async (item: {{EXAMPLE_MODULE_NAME_PASCAL}}Item) => {
    try {
      await api.{{EXAMPLE_MODULE_NAME}}.update(item.id, { status: item.status === 'pending' ? 'done' : 'pending' });
      await load();
    } catch (err) {
      onError(err, { action: `Cambiar estado de ${item.title}`, source: '{{EXAMPLE_MODULE_NAME_PASCAL}}View.toggleStatus' });
    }
  };

  const remove = async (item: {{EXAMPLE_MODULE_NAME_PASCAL}}Item) => {
    try {
      await api.{{EXAMPLE_MODULE_NAME}}.remove(item.id);
      await load();
      toast.success(`"${item.title}" borrado`);
    } catch (err) {
      onError(err, { action: `Borrar ${item.title}`, source: '{{EXAMPLE_MODULE_NAME_PASCAL}}View.remove' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{{EXAMPLE_MODULE_NAME_PASCAL}}</CardTitle>
          {hasPermission('{{EXAMPLE_MODULE_NAME}}.create') && (
            <CardAction>
              <Button onClick={() => setOpen(true)}>
                <Plus /> Nuevo
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.title}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'done' ? 'default' : 'secondary'}>
                      {item.status === 'done' ? <CircleCheck /> : <Circle />}
                      {item.status === 'done' ? 'Hecho' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {hasPermission('{{EXAMPLE_MODULE_NAME}}.edit') && (
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(item)}>
                          Marcar {item.status === 'pending' ? 'hecho' : 'pendiente'}
                        </Button>
                      )}
                      {hasPermission('{{EXAMPLE_MODULE_NAME}}.delete') && (
                        <Button size="sm" variant="destructive" onClick={() => remove(item)}>
                          <Trash2 /> Borrar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo {{EXAMPLE_MODULE_NAME_PASCAL}}</DialogTitle></DialogHeader>
          <Input placeholder="Título" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input placeholder="Descripción" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
