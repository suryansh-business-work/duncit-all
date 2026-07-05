/** SUPER_ADMIN can access every Duncit console regardless of app role. */
export const SUPER_ROLE = 'SUPER_ADMIN';

/** The per-portal session helpers — same API as the portals' local `lib/session.ts`. */
export interface PortalSession {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
  /** Whether the given roles grant access to this app. */
  hasAppAccess(roles?: readonly string[] | null): boolean;
  accessDeniedMessage(): string;
}

/**
 * Build the session helpers portals carried as identical local copies,
 * parameterized by the portal's token key + required roles so migrating is a
 * mechanical `createSession(appConfig.tokenKey, appConfig.requiredRoles, …)`.
 */
export function createSession(tokenKey: string, requiredRoles: string[] = [], fullName = 'this console'): PortalSession {
  return {
    getToken() {
      try {
        return localStorage.getItem(tokenKey);
      } catch {
        return null;
      }
    },
    setToken(token: string) {
      localStorage.setItem(tokenKey, token);
    },
    clearToken() {
      try {
        localStorage.removeItem(tokenKey);
      } catch {
        /* storage unavailable — nothing to clear */
      }
    },
    hasAppAccess(roles?: readonly string[] | null) {
      if (!roles || roles.length === 0) return false;
      if (roles.includes(SUPER_ROLE)) return true;
      return requiredRoles.some((role) => roles.includes(role));
    },
    accessDeniedMessage() {
      return `You do not have access to ${fullName}. Please contact your administrator.`;
    },
  };
}
