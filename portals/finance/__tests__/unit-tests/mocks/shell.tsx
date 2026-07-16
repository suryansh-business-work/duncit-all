import { vi } from 'vitest';

/** Stubs for @duncit/shell chrome + factories used by the finance portal. */

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

export const createApolloClient = (_opts: any) => ({});
export const parseEnvRoles = (_env: unknown, def: string[]) => def;
export const mountPortal = vi.fn();
export const ColorModeProvider = ({ children }: any) => children;
