import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import EntityAnalyticsPage from './pages/entity-analytics/EntityAnalyticsPage';
import { ANALYTICS_PAGES } from './pages/entity-analytics/pages';
import AnalyticsMailsPage from './pages/analytics-mails/AnalyticsMailsPage';
import AnalyticsAlertsPage from './pages/analytics-alerts/AnalyticsAlertsPage';
import { runtime } from './runtime';

const authed = createAuthed({
  getToken: runtime.session.getToken,
  wrap: (el) => <runtime.AppShell>{el}</runtime.AppShell>,
});

/**
 * Every signed-in route: the profile, the two Settings pages and one
 * dashboard per subject. Each dashboard is keyed by its path, so moving
 * between them starts the next one at its own default period.
 */
const SIGNED_IN: ReadonlyArray<{ path: string; element: ReactElement }> = [
  { path: '/profile', element: <ProfilePage /> },
  { path: '/settings/analytics-mails', element: <AnalyticsMailsPage /> },
  { path: '/settings/alerts', element: <AnalyticsAlertsPage /> },
  ...ANALYTICS_PAGES.map((page) => ({
    path: page.path,
    element: <EntityAnalyticsPage key={page.path} page={page} />,
  })),
];

/** The console has no welcome page: its home is the first dashboard in the sidebar. */
const HOME = ANALYTICS_PAGES[0].path;

/** One dashboard per subject, grouped in the sidebar: Business, Growth, Support, Tech, Security and Testing. */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<runtime.LoginPage />} />
      {SIGNED_IN.map(({ path, element }) => (
        <Route key={path} path={path} element={authed(element)} />
      ))}
      <Route path="*" element={<Navigate to={HOME} replace />} />
    </Routes>
  );
}
