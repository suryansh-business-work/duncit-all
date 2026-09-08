import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ExpensesPage, { ExpenseClaimPage } from './pages/expenses';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/expenses" element={authed(<ExpensesPage />)} />
      <Route path="/expenses/new" element={authed(<ExpenseClaimPage />)} />
      <Route path="/expenses/:expenseId/edit" element={authed(<ExpenseClaimPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
