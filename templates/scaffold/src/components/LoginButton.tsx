import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }): void;
          renderButton(parent: HTMLElement, options: { theme?: string; size?: string }): void;
        };
      };
    };
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface LoginButtonProps {
  onSuccess: (idToken: string) => void;
  onError?: (message: string) => void;
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve) => existing.addEventListener('load', () => resolve()));
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el script de Google'));
    document.head.appendChild(script);
  });
}

export function LoginButton({ onSuccess, onError }: LoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID) {
      onError?.('VITE_GOOGLE_CLIENT_ID no está configurado');
      return;
    }
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onSuccess(response.credential),
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
        });
      })
      .catch((err) => onError?.((err as Error).message));
    return () => {
      cancelled = true;
    };
  }, [onSuccess, onError]);

  return <div ref={buttonRef} />;
}
