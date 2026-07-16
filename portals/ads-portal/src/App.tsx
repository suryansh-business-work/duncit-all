import { Navigate, Route, Routes } from 'react-router-dom';
import { createAuthed, ProfilePage } from '@duncit/shell';
import { NotifyHost } from '@duncit/dialogs';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MyAdsPage from './pages/ads/MyAdsPage';
import AdDetailsPage from './pages/ads/AdDetailsPage';
import CreateAdPage from './pages/create-ad-page/CreateAdPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={authed(<DashboardPage />)} />
        <Route path="/ads" element={authed(<MyAdsPage />)} />
        <Route path="/ads/new" element={authed(<CreateAdPage />)} />
        <Route path="/ads/:id" element={authed(<AdDetailsPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotifyHost />
    </>
  );
}
