import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * The two facts the chrome needs that only the portal's boot knows: where the
 * server is, and which key its token is stored under.
 *
 * A context rather than props threaded through AppShell → AppHeader → a drawer
 * → a tool, because everything in that chain is chrome the portal does not
 * write and should not have to pass a socket URL through.
 */
export interface ShellRuntime {
  graphqlUrl: string;
  tokenKey: string;
}

const RuntimeContext = createContext<ShellRuntime | null>(null);

export function ShellRuntimeProvider({
  graphqlUrl,
  tokenKey,
  children,
}: Readonly<{ graphqlUrl: string; tokenKey: string; children: ReactNode }>) {
  const value = useMemo(() => ({ graphqlUrl, tokenKey }), [graphqlUrl, tokenKey]);
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

/**
 * Null outside a portal boot — a test rendering the header on its own, say.
 * Features that need a live server check for it rather than assuming one.
 */
export function useShellRuntime(): ShellRuntime | null {
  return useContext(RuntimeContext);
}

/** The token this portal signed in with, or null. */
export function readToken(runtime: ShellRuntime | null): string | null {
  if (!runtime) return null;
  try {
    return globalThis.localStorage.getItem(runtime.tokenKey);
  } catch {
    return null;
  }
}
