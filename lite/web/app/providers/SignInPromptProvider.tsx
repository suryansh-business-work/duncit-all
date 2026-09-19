import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLiteSession } from '../../../shared/session';

interface SignInPromptValue {
  dialogOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
  /** Opens the sign-in dialog when needed; resolves true once signed in, false if the reader closed it. */
  requireSignIn: () => Promise<boolean>;
}

const PromptContext = createContext<SignInPromptValue | null>(null);

type Waiter = (signedIn: boolean) => void;

/**
 * One sign-in dialog for the whole app. A page that needs an account calls
 * `requireSignIn()` and carries on when it resolves true, so "register",
 * "subscribe" and "create" never each keep their own dialog state.
 */
export function SignInPromptProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { signedIn } = useLiteSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const waiters = useRef<Waiter[]>([]);

  const settle = useCallback((value: boolean) => {
    const pending = waiters.current;
    waiters.current = [];
    for (const resolve of pending) resolve(value);
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    setDialogOpen(false);
    settle(true);
  }, [signedIn, settle]);

  const openSignIn = useCallback(() => setDialogOpen(true), []);
  const closeSignIn = useCallback(() => {
    setDialogOpen(false);
    settle(false);
  }, [settle]);

  const requireSignIn = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        if (signedIn) {
          resolve(true);
          return;
        }
        waiters.current.push(resolve);
        setDialogOpen(true);
      }),
    [signedIn],
  );

  const value = useMemo<SignInPromptValue>(
    () => ({ dialogOpen, openSignIn, closeSignIn, requireSignIn }),
    [dialogOpen, openSignIn, closeSignIn, requireSignIn],
  );
  return <PromptContext.Provider value={value}>{children}</PromptContext.Provider>;
}

export function useSignInPrompt(): SignInPromptValue {
  const value = useContext(PromptContext);
  if (!value) throw new Error('useSignInPrompt needs a SignInPromptProvider');
  return value;
}
