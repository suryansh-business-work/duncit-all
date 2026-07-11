/** API origin resolution, extracted so the fallback chain is unit-testable. */
export interface ServerEnv {
  VITE_SERVER_URL?: string;
  DEV?: boolean;
}

export function resolveServerBase(env: ServerEnv): string {
  return env.VITE_SERVER_URL || (env.DEV ? 'http://localhost:2001' : 'https://server.duncit.com');
}

export const SERVER_BASE = resolveServerBase(import.meta.env);
