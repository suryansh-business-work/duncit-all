import type { ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import {
  createAuthed,
  createPortalRuntime,
  mountPortal,
  ProfilePage,
  type AppConfig,
} from '@duncit/shell';
import { createSessionUserLoader } from '@duncit/user-context';
import { NotifyHost } from '@duncit/dialogs';
import { DIRECTORY_BUNDLE, flattenCatalogue } from '@duncit/app-settings';
import EntityDashboard from './EntityDashboard';
import type { DirectorySpec } from './types';

/**
 * A directory portal, mounted.
 *
 * The four consoles are the same application over a different entity — same
 * routes, same chrome, same login, same copy namespace — so the whole bootstrap
 * lives here once and a portal supplies only what genuinely differs: its
 * config, its spec, its dev port and its logger.
 *
 * Written this way because the alternative was measured: four portals each
 * hand-writing `apollo.ts`, `session.ts`, `AppShell.tsx`, `LoginPage.tsx`,
 * `url-configs.ts`, `App.tsx` and `main.tsx` put 76 duplicated lines into every
 * one of them, which the duplication gate counts and rule 40 forbids. What is
 * left in a portal now is its identity and nothing else.
 */
export interface MountDirectoryPortalOptions {
  appConfig: AppConfig;
  /** Which entity this console is for — venues, clubs, club admins or hosts. */
  spec: DirectorySpec;
  /** Vite dev-server port, used to build the localhost URL. */
  devPort: number;
  /** Production subdomain under duncit.com. */
  subdomain: string;
  /** This console's logger from `logs.portal.<key>`. */
  logsPortal: Parameters<typeof mountPortal>[0]['logsPortal'];
  /**
   * The console's list and detail screens.
   *
   * Omitted while an entity ships its dashboard ahead of its console — the
   * tiles then report their numbers without pretending to be a way in, which
   * beats four tiles that navigate nowhere. Supplying it turns every tile into
   * a way into the list already filtered to what it counted.
   */
  console?: DirectoryConsole;
}

/** One entity's list and detail screens, and where they live. */
export interface DirectoryConsole {
  /** Route the list lives at, e.g. `/venues`. */
  listPath: string;
  /** Param name the detail route binds, matching what the detail page reads. */
  detailParam: string;
  List: ComponentType;
  Detail: ComponentType;
  /** Catalogue key for the list's sidebar entry. */
  navLabelKey: string;
  /** Shell icon name for that entry. */
  navIcon: string;
}

/**
 * An env var as a URL, or '' when it is absent.
 *
 * `ImportMetaEnv` carries an `any` index signature beside its known booleans,
 * so a bare `env.VITE_X || fallback` widens to `string | true` and fails
 * typecheck wherever the package is compiled outside a portal. Narrowing here
 * once is also the honest read: an env var is a string or it is not set.
 */
const envUrl = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Where this console talks to, and where it lives.
 *
 * Vite sets `import.meta.env.DEV` automatically: true under `vite dev`, false
 * in a build. `VITE_GRAPHQL_URL` overrides both, which is what the Cypress e2e
 * build uses to force a same-origin `/graphql`.
 */
function resolveUrls(devPort: number, subdomain: string) {
  const isDevelopment = import.meta.env.DEV;
  const fallbackGraphql = isDevelopment
    ? 'http://localhost:2001/graphql'
    : 'https://server.duncit.com/graphql';
  const fallbackApp = isDevelopment
    ? `http://localhost:${devPort}`
    : `https://${subdomain}.duncit.com`;
  return {
    isDevelopment,
    graphqlUrl: envUrl(import.meta.env.VITE_GRAPHQL_URL) || fallbackGraphql,
    appUrl: envUrl(import.meta.env.VITE_APP_URL) || fallbackApp,
  };
}

export function mountDirectoryPortal(options: Readonly<MountDirectoryPortalOptions>): void {
  const { appConfig, spec, devPort, subdomain, logsPortal, console: consoleScreens } = options;
  const urls = resolveUrls(devPort, subdomain);

  // The sidebar gains the list entry only when the list exists, so a console
  // shipping its dashboard first never shows a nav item that goes nowhere.
  // It has to be on the config the runtime is built FROM — the chrome reads
  // `config.nav`, so augmenting it afterwards would change nothing.
  const config: AppConfig = consoleScreens
    ? {
        ...appConfig,
        nav: [
          ...appConfig.nav,
          {
            label: appConfig.name,
            labelKey: consoleScreens.navLabelKey,
            to: consoleScreens.listPath,
            icon: consoleScreens.navIcon,
          },
        ],
      }
    : appConfig;

  const runtime = createPortalRuntime(config, urls.graphqlUrl);
  const { AppShell, LoginPage, session, apolloClient } = runtime;

  const authed = createAuthed({
    getToken: session.getToken,
    wrap: (el) => <AppShell>{el}</AppShell>,
  });

  // The list and its detail page, when this entity has them yet. Built here so
  // the dashboard's tiles and the routes cannot disagree about where the list
  // lives — one `listPath` feeds both.
  const consoleRoutes = consoleScreens
    ? [
        <Route
          key="list"
          path={consoleScreens.listPath}
          element={authed(<consoleScreens.List />)}
        />,
        <Route
          key="detail"
          path={`${consoleScreens.listPath}/:${consoleScreens.detailParam}`}
          element={authed(<consoleScreens.Detail />)}
        />,
      ]
    : [];

  const App = () => (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={authed(<EntityDashboard spec={spec} listPath={consoleScreens?.listPath} />)}
      />
      {consoleRoutes}
      <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  mountPortal({
    config: {
      key: config.key,
      name: config.name,
      tokenKey: config.tokenKey,
      colorModeKey: config.colorModeKey,
      accent: config.accent,
    },
    apolloClient,
    graphqlUrl: urls.graphqlUrl,
    logsPortal,
    // ONE namespace for all four consoles, layered over the shell's: they are
    // the same screen over a different entity, so four namespaces would be four
    // copies of "Awaiting review" drifting apart (rule 34).
    i18nFallback: flattenCatalogue(DIRECTORY_BUNDLE),
    loadUser: createSessionUserLoader(apolloClient),
    extras: <NotifyHost />,
    children: <App />,
  });
}
