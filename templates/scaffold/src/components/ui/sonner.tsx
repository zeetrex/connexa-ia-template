import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Sin next-themes: este scaffold no tiene selector de tema (light/dark/system)
// todavía, así que el toast queda fijo al tema claro — las variables CSS de
// abajo lo atan igual a la paleta de marca real (src/index.css), no a los
// grises default de sonner.
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
