import { Navigate, Route, Routes } from 'react-router-dom';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsListPage from './pages/documents/DocumentsListPage';
import DocumentDetailPage from './pages/documents/DocumentDetailPage';
import PoliciesPage from './pages/policies/PoliciesPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/documents" element={authed(<DocumentsListPage />)} />
      <Route path="/documents/:id" element={authed(<DocumentDetailPage />)} />
      <Route path="/policies" element={authed(<PoliciesPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
