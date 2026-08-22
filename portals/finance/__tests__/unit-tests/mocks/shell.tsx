import { vi } from 'vitest';

/** Stubs for @duncit/shell chrome + factories used by the finance portal. */

/**
 * Translation is the real thing.
 *
 * The shell hook is built to work with no provider above it — it falls back to
 * every shipped namespace — so a finance page rendered in a test still reads
 * "Invoice Management" rather than `finance.invoice.title`. A stub returning
 * the key would fail every copy assertion, and leaving it out made `t` itself
 * undefined.
 */
export { useTranslation } from '../../../../../packages/shell/src/i18n/useTranslation';
export { fallbackT } from '../../../../../packages/shell/src/i18n/fallback';

export const AppIcon = ({ name }: any) => <span data-testid="app-icon">{name}</span>;

export const WelcomeDashboard = ({ name, tagline, children }: any) => (
  <div data-testid="welcome-dashboard">
    <span>{name}</span>
    <span>{tagline}</span>
    {children}
  </div>
);

export function AppShell({ children, onLogout, hasAccess, loading, user }: any) {
  return (
    <div data-testid="shell">
      <button type="button" onClick={onLogout}>
        logout
      </button>
      <span data-testid="shell-user">{user?.name ?? 'nouser'}</span>
      <span data-testid="shell-access">{String(hasAccess)}</span>
      <span data-testid="shell-loading">{String(loading)}</span>
      {children}
    </div>
  );
}

export const ProfilePage = () => <div data-testid="profile-page">Profile</div>;

export const PortalLoginPage = (_props: any) => <div data-testid="portal-login">Login</div>;

export const createAuthed = (opts: any) => (el: any) => (opts?.wrap ? opts.wrap(el) : el);

export const createSession = (_tokenKey: string, _roles: unknown, _fullName: string) => ({
  getToken: vi.fn(() => 'token'),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  hasAppAccess: vi.fn(() => true),
  accessDeniedMessage: 'access denied',
});

/** Mirrors the shell's runtime Google client-id store (set at boot from the
 *  Tech portal env), so components reading it can be driven from a test. */
let googleClientId = '';
export const getGoogleClientId = () => googleClientId;
export const setGoogleClientId = (next?: string | null) => {
  googleClientId = next?.trim() ?? '';
};

export const createApolloClient = (_opts: any) => ({});
export const parseEnvRoles = (_env: unknown, def: string[]) => def;
export const mountPortal = vi.fn();
export const ColorModeProvider = ({ children }: any) => children;
