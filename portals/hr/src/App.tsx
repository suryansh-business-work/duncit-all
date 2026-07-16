import { Navigate, Route, Routes } from 'react-router-dom';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
