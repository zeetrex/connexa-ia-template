import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Home, Users, ShieldCheck, Package, LogOut, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { api, ApiRequestError } from './lib/api';
import { buildErrorDebugPayload } from './lib/error-debug';
import { LoginButton } from './components/LoginButton';
import { UsersView } from './components/UsersView';
import { RolesView } from './components/RolesView';
import { {{EXAMPLE_MODULE_NAME_PASCAL}}View } from './components/{{EXAMPLE_MODULE_NAME_PASCAL}}View';
import { DiagnosticsView } from './components/DiagnosticsView';
import { ErrorDebugDialog } from './components/ErrorDebugDialog';
import { Toaster } from './components/ui/sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from './components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';

type Section = 'home' | 'users' | 'roles' | '{{EXAMPLE_MODULE_NAME}}' | 'diagnostics';

function AuthGate({ children }: { children?: React.ReactNode }) {
  const { status, refresh } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleSuccess = async (idToken: string) => {
    try {
      await api.auth.google(idToken);
      setLoginError(null);
      await refresh();
    } catch (err) {
      setLoginError(err instanceof ApiRequestError ? err.message : 'No se pudo iniciar sesión');
    }
  };

  if (status === 'checking') return <div className="p-8">Cargando…</div>;

  if (status === 'anonymous') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">{{PROJECT_NAME_TITLE}}</CardTitle>
            <CardDescription>Iniciá sesión con tu cuenta de Google para continuar</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <LoginButton onSuccess={handleGoogleSuccess} onError={setLoginError} />
            {loginError && <p className="text-sm text-destructive text-center">{loginError}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

const NAV: { key: Section; label: string; icon: typeof Home; permission?: string }[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'users', label: 'Usuarios', icon: Users, permission: 'user.view' },
  { key: 'roles', label: 'Roles', icon: ShieldCheck, permission: 'role.view' },
  { key: '{{EXAMPLE_MODULE_NAME}}', label: '{{EXAMPLE_MODULE_NAME_PASCAL}}', icon: Package, permission: '{{EXAMPLE_MODULE_NAME}}.view' },
  { key: 'diagnostics', label: 'Diagnóstico', icon: Activity, permission: 'diagnostics.view' },
];

function AppSidebar({ current, onSelect }: { current: Section; onSelect: (s: Section) => void }) {
  const { hasPermission } = useAuth();
  const { open } = useSidebar();
  const visible = NAV.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <Sidebar>
      <SidebarHeader>
        {open && <span className="px-1 text-sm font-semibold">{{PROJECT_NAME_TITLE}}</span>}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {visible.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton isActive={item.key === current} onClick={() => onSelect(item.key)}>
                <item.icon className="size-4 shrink-0" />
                {open && item.label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

function Shell() {
  const { user, hasPermission, logout } = useAuth();
  const [section, setSection] = useState<Section>('home');
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorDialogTitle, setErrorDialogTitle] = useState('');
  const [errorDialogDetails, setErrorDialogDetails] = useState('');

  // Todo error de una acción del usuario pasa por acá: un toast visible +
  // transitorio para el mensaje real del servidor, y el detalle técnico
  // completo (status, método, request/response body) queda un clic atrás en
  // el diálogo de debug — nunca sólo en la consola del navegador.
  const reportError = useCallback(
    (error: unknown, context: { action: string; source: string; toastMessage: string }) => {
      const debugPayload = buildErrorDebugPayload(error, {
        action: context.action,
        source: context.source,
        timestamp: new Date().toISOString(),
      });
      setErrorDialogTitle(debugPayload.title);
      setErrorDialogDetails(debugPayload.detailText);
      setErrorDialogOpen(true);
      toast.error(context.toastMessage);
      console.error(error);
    },
    [],
  );

  // Contrato que reciben las vistas (`onError`, ver §5.1 de requirements.md):
  // no deciden por sí solas qué hacer con un error, sólo lo reportan con qué
  // acción/origen lo generó.
  const handleChildError = useCallback(
    (error: unknown, context: { action: string; source: string }) => {
      reportError(error, {
        action: context.action,
        source: context.source,
        toastMessage: 'Se produjo un error en la operación',
      });
    },
    [reportError],
  );

  const visible = NAV.filter((item) => !item.permission || hasPermission(item.permission));
  const current = visible.find((item) => item.key === section) ?? visible[0];
  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      <SidebarProvider>
        <AppSidebar current={current?.key ?? 'home'} onSelect={setSection} />
        <SidebarInset>
          <header className="flex items-center justify-between border-b px-6 py-3">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">{current?.label}</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1 text-sm">
                <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-full text-xs font-medium">
                  {initial}
                </span>
                <span>{user?.email}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-muted-foreground font-normal">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="p-6">
            {current?.key === 'home' && (
              <p className="text-sm text-muted-foreground">Bienvenido a {{PROJECT_NAME_TITLE}}.</p>
            )}
            {current?.key === 'users' && <UsersView onError={handleChildError} />}
            {current?.key === 'roles' && <RolesView onError={handleChildError} />}
            {current?.key === '{{EXAMPLE_MODULE_NAME}}' && (
              <{{EXAMPLE_MODULE_NAME_PASCAL}}View onError={handleChildError} />
            )}
            {current?.key === 'diagnostics' && <DiagnosticsView />}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
      <ErrorDebugDialog
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        title={errorDialogTitle}
        details={errorDialogDetails}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <Shell />
      </AuthGate>
    </AuthProvider>
  );
}
