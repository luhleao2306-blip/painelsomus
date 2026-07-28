import { useEffect } from 'react';

/**
 * Força o modo claro em páginas públicas (formulários enviados a clientes),
 * restaurando o tema original ao sair da página.
 */
export function useForceLight() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    const prevScheme = root.style.colorScheme;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    return () => {
      if (wasDark) root.classList.add('dark');
      root.style.colorScheme = prevScheme;
    };
  }, []);
}
