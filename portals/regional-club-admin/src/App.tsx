import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, PortalAppShell, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import { RegionStructurePage } from './pages/region-structure';
import { RegionClubAdminsPage } from './pages/club-admins';
import RegionPodDetailsPage from './pages/RegionPodDetailsPage';
import { appConfig } from './config/app-config';
import { clearToken, getToken, hasAppAccess } from './lib/session';

/** The shared chrome, wired to this console's session — the adapter every
 * portal used to keep its own copy of (rule 40) now lives in @duncit/shell. */
const authed = createAuthed({
  getToken,
  wrap: (el) => (
    <PortalAppShell
      config={appConfig}
      nav={appConfig.nav}
      clearToken={clearToken}
      hasAppAccess={hasAppAccess}
      profileTo="/profile"
    >
      {el}
    </PortalAppShell>
  ),
});

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/profile" element={authed(<ProfilePage />)} />
      {/* The canvas IS the console — a manager opens this to see their region,
          not a dashboard about it. */}
      <Route path="/" element={authed(<RegionStructurePage />)} />
      <Route path="/club-admins" element={authed(<RegionClubAdminsPage />)} />
      {/* Reached from either drill-down: a Host's pods on the canvas, or a
          Club Admin's clubs on the list. Both end here. */}
      <Route path="/pods/:id" element={authed(<RegionPodDetailsPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
