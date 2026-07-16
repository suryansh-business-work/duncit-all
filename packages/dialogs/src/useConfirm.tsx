import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import type { ConfirmColor } from './ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shorthand for confirmColor="error". Ignored when `confirmColor` is set. */
  destructive?: boolean;
  /** Explicit confirm-button color; wins over `destructive`. */
  confirmColor?: ConfirmColor;
}

type Resolver = (value: boolean) => void;

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
}

export function ConfirmProvider({ children }: Readonly<ProviderProps>) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const resolve = useCallback((value: boolean) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    setOptions(null);
    if (r) r(value);
  }, []);

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolveFn) => {
        resolverRef.current = resolveFn;
        setOptions(next);
      }),
    [],
  );

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={!!options}
        title={options?.title ?? ''}
        message={options?.message}
        confirmLabel={options?.confirmLabel ?? 'Confirm'}
        cancelLabel={options?.cancelLabel ?? 'Cancel'}
        destructive={options?.destructive}
        confirmColor={options?.confirmColor}
        onClose={() => resolve(false)}
        onConfirm={() => resolve(true)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within <ConfirmProvider>');
  }
  return ctx.confirm;
}
