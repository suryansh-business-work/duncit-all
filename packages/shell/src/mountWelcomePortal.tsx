import { Navigate, Route, Routes } from 'react-router';
import { createSessionUserLoader } from '@duncit/user-context';
import { createAuthed } from './auth/RequireAuth';
import { ProfilePage } from './chrome/ProfilePage';
import { WelcomeDashboard } from './dashboard/WelcomeDashboard';
import { useTranslation } from './i18n/useTranslation';
import { createPortalRuntime } from './lib/portal-runtime';
import { mountPortal } from './mountPortal';
import type { AppConfig, MountPortalOptions } from './types';

/**
 * The build-time values a console's API address is derived from. A portal
 * passes its own `import.meta.env`: the shell is compiled inside each portal's
 * Vite build, but it is not a Vite project itself, so it cannot name one.
 */
export interface PortalBuildEnv {
  readonly DEV: boolean;
  readonly VITE_GRAPHQL_URL?: unknown;
}

export interface MountWelcomePortalOptions {
  appConfig: AppConfig;
  /** The portal's `import.meta.env`. */
  env: PortalBuildEnv;
  /** This console's logger from `logs.portal.<key>`. */
  logsPortal: MountPortalOptions['logsPortal'];
}

/**
 * Where a console talks to: the URL the build baked in, else the local server
 * under `vite dev`, else production.
 */
export function resolvePortalGraphqlUrl(env: PortalBuildEnv): string {
  if (typeof env.VITE_GRAPHQL_URL === 'string' && env.VITE_GRAPHQL_URL) {
    return env.VITE_GRAPHQL_URL;
  }
  return env.DEV ? 'http://localhost:2001/graphql' : 'https://server.duncit.com/graphql';
}

/** The welcome dashboard, with the console's tagline in the reader's language. */
function WelcomePage({ config }: Readonly<{ config: AppConfig }>) {
  const { t } = useTranslation();
  const tagline = config.taglineKey ? t(config.taglineKey) : config.tagline;
  return (
    <WelcomeDashboard
      dashboardId={`${config.key}.overview`}
      name={config.name}
      tagline={tagline}
      modules={config.modules}
    />
  );
}

/**
 * A console that is only the shell: login, the welcome dashboard at `/`, and
 * the profile page.
 *
 * This is what a new subdomain ships before its first screen exists. The
 * portal hands over its config and nothing else, so standing one up adds no
 * copied bootstrap — and its screens are added to its own route table later,
 * when it outgrows this.
 */
export function mountWelcomePortal(options: Readonly<MountWelcomePortalOptions>): void {
  const { appConfig, env, logsPortal } = options;
  const graphqlUrl = resolvePortalGraphqlUrl(env);
  const { AppShell, LoginPage, session, apolloClient } = createPortalRuntime(appConfig, graphqlUrl);
  const authed = createAuthed({
    getToken: session.getToken,
    wrap: (el) => <AppShell>{el}</AppShell>,
  });

  mountPortal({
    config: appConfig,
    apolloClient,
    graphqlUrl,
    logsPortal,
    loadUser: createSessionUserLoader(apolloClient),
    children: (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={authed(<WelcomePage config={appConfig} />)} />
        <Route path="/profile" element={authed(<ProfilePage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    ),
  });
}
