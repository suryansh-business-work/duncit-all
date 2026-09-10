import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useUserData } from '@duncit/user-context';
import { AppShell } from '../chrome/AppShell';
import { PortalLoginPage } from '../portal-login';
import { createApolloClient } from './apollo';
import { createSession } from './session';
import type { AppConfig } from '../types';

/**
 * A portal's whole bootstrap, from its config.
 *
 * Every console used to hand-write the same four adapters — `apollo.ts`,
 * `lib/session.ts`, `components/AppShell.tsx` and `pages/LoginPage.tsx`. They
 * are not thin by accident: the shell already owns the header, the sidebar, the
 * login form and the token logic, so those files exist only to pass one
 * `appConfig` into four shared functions.
 *
 * Twenty-one copies of that is what rule 40 is about, and the duplication gate
 * counts it. So the wiring lives here once and a portal asks for it:
 *
 * ```ts
 * export const runtime = createPortalRuntime(appConfig, urlConfigs.graphqlUrl);
 * ```
 *
 * Existing portals keep their local adapters — this is additive, and moving
 * them over is a per-portal change with its own diff, not a flag day across
 * every console at once.
 */
export interface PortalRuntime {
  /** The configured Apollo client, named for the platform rate limiter. */
  apolloClient: ReturnType<typeof createApolloClient>;
  /** Token + role helpers, keyed on this portal's own token key. */
  session: ReturnType<typeof createSession>;
  /** The shared chrome, already wired to this portal's session and user. */
  AppShell: (props: Readonly<{ children: ReactNode }>) => ReactNode;
  /** The shared login page, already wired to this portal's session. */
  LoginPage: () => ReactNode;
}

export function createPortalRuntime(config: AppConfig, graphqlUrl: string): PortalRuntime {
  const session = createSession(config.tokenKey, config.requiredRoles, config.fullName);

  const apolloClient = createApolloClient({
    graphqlUrl,
    getToken: session.getToken,
    // Names this console for the platform rate limiter, so it carries its own
    // ceiling instead of sharing one with every other portal.
    app: config.key,
  });

  /**
   * The chrome. Declared here rather than inside a component so it is a stable
   * module-level identity per runtime (S6478) — a portal renders it as
   * `<runtime.AppShell>` on every route.
   */
  function RuntimeAppShell({ children }: Readonly<{ children: ReactNode }>) {
    const navigate = useNavigate();
    const { user, loading, logout: ctxLogout } = useUserData();

    const logout = () => {
      session.clearToken();
      ctxLogout();
      navigate('/login', { replace: true });
    };

    return (
      <AppShell
        config={config}
        nav={config.nav}
        user={user ?? undefined}
        loading={loading}
        hasAccess={user ? session.hasAppAccess(user.roles) : undefined}
        onDenied={session.clearToken}
        profileTo="/profile"
        onLogout={logout}
      >
        {children}
      </AppShell>
    );
  }

  function RuntimeLoginPage() {
    return (
      <PortalLoginPage
        appConfig={config}
        session={{
          setToken: session.setToken,
          hasAppAccess: session.hasAppAccess,
          accessDeniedMessage: session.accessDeniedMessage,
        }}
      />
    );
  }

  return { apolloClient, session, AppShell: RuntimeAppShell, LoginPage: RuntimeLoginPage };
}
