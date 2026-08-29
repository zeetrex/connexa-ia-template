import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangleIcon, DatabaseIcon } from 'lucide-react';

interface ErrorDebugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  details: string;
}

// Un error que traiga "databaseUrl" en su payload (típicamente una falla de
// configuración/conexión) se muestra con la credencial enmascarada — mismo
// criterio que ya usa /api/diagnostics.
function maskDatabaseUrl(url: string): string {
  return url.replace(/:[^:@]*@/, ':***@');
}

function extractDbInfo(details: string): { databaseUrl?: string; dbError?: string } | null {
  try {
    const urlMatch = details.match(/"databaseUrl":\s*"([^"]+)"/);
    const msgMatch = details.match(/"message":\s*"([^"]+)"/);
    if (urlMatch || msgMatch) {
      return {
        databaseUrl: urlMatch ? maskDatabaseUrl(urlMatch[1]) : undefined,
        dbError: msgMatch?.[1],
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function ErrorDebugDialog({ open, onOpenChange, title, details }: ErrorDebugDialogProps) {
  const dbInfo = extractDbInfo(details);
  const isDbError =
    details.includes('base de datos') ||
    details.includes('DATABASE_URL') ||
    details.includes('ENOTFOUND') ||
    details.includes('ECONNREFUSED') ||
    details.includes('password authentication failed');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="h-4 w-4 text-destructive" />
            Debug de error
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        {isDbError && (
          <div className="flex items-start gap-3 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
            <DatabaseIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">Posible problema de base de datos</p>
              <p>
                Este error puede indicar que la variable{' '}
                <code className="rounded bg-orange-100 px-1 dark:bg-orange-900">DATABASE_URL</code> no está
                configurada, la base de datos no es accesible, o las credenciales son incorrectas.
              </p>
              {dbInfo?.databaseUrl && (
                <p>
                  URL configurada:{' '}
                  <code className="rounded bg-orange-100 px-1 dark:bg-orange-900">{dbInfo.databaseUrl}</code>
                </p>
              )}
              {dbInfo?.dbError && (
                <p>
                  Causa: <code className="rounded bg-orange-100 px-1 dark:bg-orange-900">{dbInfo.dbError}</code>
                </p>
              )}
            </div>
          </div>
        )}

        <pre className="max-h-[50vh] overflow-auto rounded-md border bg-muted/30 p-4 text-xs leading-relaxed whitespace-pre-wrap break-words">
          {details}
        </pre>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
