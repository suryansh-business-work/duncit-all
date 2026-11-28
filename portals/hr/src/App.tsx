import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, PageErrorBoundary, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import TeamStructureListPage from './pages/team-structure';
import TeamPage from './pages/team-structure/TeamPage';
import PublicTeamPage from './pages/team-structure/PublicTeamPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/employees/list/EmployeesPage';
import HireEmployeePage from './pages/employees/hire/HireEmployeePage';
import EmployeeProfilePage from './pages/employees/profile/EmployeeProfilePage';
import HrSettingsPage from './pages/settings/HrSettingsPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/shared/:token" element={<PageErrorBoundary><PublicTeamPage /></PageErrorBoundary>} />
      <Route path="/employees" element={authed(<EmployeesPage />)} />
      <Route path="/employees/new" element={authed(<HireEmployeePage />)} />
      <Route path="/employees/:id" element={authed(<EmployeeProfilePage />)} />
      <Route path="/team-structure" element={authed(<TeamStructureListPage />)} />
      <Route path="/team-structure/:id" element={authed(<TeamPage />)} />
      <Route path="/settings" element={authed(<HrSettingsPage />)} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
