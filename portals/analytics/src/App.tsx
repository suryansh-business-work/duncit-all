import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage, WelcomePage } from '@duncit/shell';
import EntityAnalyticsPage from './pages/entity-analytics/EntityAnalyticsPage';
import { ANALYTICS_PAGES } from './pages/entity-analytics/pages';
import { appConfig } from './config/app-config';
import { runtime } from './runtime';

const authed = createAuthed({
  getToken: runtime.session.getToken,
  wrap: (el) => <runtime.AppShell>{el}</runtime.AppShell>,
});

/**
 * Every signed-in route: the welcome page, the profile, and one page per
 * subject. Each subject page is keyed by its path, so moving between them
 * starts the next one at its own default period.
 */
const SIGNED_IN: ReadonlyArray<{ path: string; element: ReactElement }> = [
  { path: '/', element: <WelcomePage config={appConfig} /> },
  { path: '/profile', element: <ProfilePage /> },
  ...ANALYTICS_PAGES.map((page) => ({
    path: page.path,
    element: <EntityAnalyticsPage key={page.path} page={page} />,
  })),
];

/** Charts and short rankings for pods, clubs, club admins and hosts. */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<runtime.LoginPage />} />
      {SIGNED_IN.map(({ path, element }) => (
        <Route key={path} path={path} element={authed(element)} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
