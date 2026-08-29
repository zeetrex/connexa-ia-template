import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

interface DiagnosticsResult {
  status: 'ok' | 'error';
  database?: { now: string; version: string };
  message?: string;
}

export function DiagnosticsView() {
  const [result, setResult] = useState<DiagnosticsResult | null>(null);

  useEffect(() => {
    api.diagnostics
      .check()
      .then(setResult)
      .catch((err) => setResult({ status: 'error', message: err.message }));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!result && <p className="text-muted-foreground">Verificando…</p>}
        {result && (
          <div className="flex items-center gap-2">
            <Badge variant={result.status === 'ok' ? 'default' : 'destructive'}>
              {result.status === 'ok' ? 'Conectado' : 'Error'}
            </Badge>
            {result.database && (
              <span className="text-muted-foreground">{result.database.version}</span>
            )}
            {result.message && <span className="text-muted-foreground">{result.message}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
