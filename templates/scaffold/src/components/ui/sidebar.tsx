import * as React from 'react';
import { PanelLeftIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_ICON = '3rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

type SidebarContextProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error('useSidebar() usado fuera de <SidebarProvider>');
  return context;
}

function SidebarProvider({
  defaultOpen = true,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & { defaultOpen?: boolean }) {
  const [open, setOpenState] = React.useState(() => {
    if (typeof document === 'undefined') return defaultOpen;
    const match = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_COOKIE_NAME}=([^;]*)`));
    return match ? match[1] === 'true' : defaultOpen;
  });

  const setOpen = React.useCallback((value: boolean) => {
    setOpenState(value);
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  }, []);

  const toggleSidebar = React.useCallback(() => setOpen(!open), [open, setOpen]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleSidebar }}>
      <div
        data-slot="sidebar-wrapper"
        style={{ '--sidebar-width': SIDEBAR_WIDTH, '--sidebar-width-icon': SIDEBAR_WIDTH_ICON, ...style } as React.CSSProperties}
        className={cn('flex min-h-svh w-full', className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { open } = useSidebar();

  return (
    <div
      data-slot="sidebar"
      data-state={open ? 'expanded' : 'collapsed'}
      className="text-sidebar-foreground relative h-svh shrink-0 transition-[width] duration-200 ease-linear"
      style={{ width: open ? 'var(--sidebar-width)' : 'var(--sidebar-width-icon)' }}
    >
      <div
        data-slot="sidebar-container"
        className={cn(
          'bg-sidebar border-sidebar-border flex h-full flex-col overflow-hidden border-r',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<'button'>) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-slot="sidebar-trigger"
      type="button"
      className={cn('hover:bg-sidebar-accent inline-flex size-7 items-center justify-center rounded-md', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}

function SidebarInset({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-inset" className={cn('flex min-h-svh flex-1 flex-col', className)} {...props} />;
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('flex flex-col gap-2 p-3', className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('flex flex-col gap-2 p-3', className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto', className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('flex w-full flex-col gap-1 px-2', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('relative', className)} {...props} />;
}

const sidebarMenuButtonVariants = cva(
  'flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      isActive: {
        true: 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
        false: '',
      },
    },
    defaultVariants: { isActive: false },
  },
);

function SidebarMenuButton({
  className,
  isActive,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof sidebarMenuButtonVariants> & { isActive?: boolean }) {
  const { open } = useSidebar();
  return (
    <button
      data-slot="sidebar-menu-button"
      data-active={isActive}
      title={!open ? String(props.children) : undefined}
      className={cn(sidebarMenuButtonVariants({ isActive }), !open && 'justify-center', className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
};
