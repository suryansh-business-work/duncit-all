import { Navigate, Route, Routes } from 'react-router';
import { ProfilePage, createAuthed } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChallengesPage from './pages/challenges/ChallengesPage';
import ToolsPage from './pages/tools/ToolsPage';
import PresetsPage from './pages/presets/PresetsPage';
import MappingPage from './pages/mapping/MappingPage';
import PodChallengesPage from './pages/pod-challenges/PodChallengesPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import LeaderboardBoardsPage from './pages/leaderboard/LeaderboardBoardsPage';
import LeaderboardPointsPage from './pages/leaderboard/LeaderboardPointsPage';
import LeaderboardSettingsPage from './pages/leaderboard/LeaderboardSettingsPage';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/tools" element={authed(<ToolsPage />)} />
      <Route path="/tools/presets" element={authed(<PresetsPage />)} />
      <Route path="/category-mapping" element={authed(<MappingPage />)} />
      <Route path="/challenges" element={authed(<ChallengesPage />)} />
      <Route path="/pod-challenges" element={authed(<PodChallengesPage view="all" />)} />
      <Route path="/live" element={authed(<PodChallengesPage view="live" />)} />
      <Route path="/results" element={authed(<PodChallengesPage view="results" />)} />
      <Route path="/notifications" element={authed(<NotificationsPage />)} />
      <Route path="/audit-logs" element={authed(<AuditLogsPage />)} />
      <Route path="/leaderboard" element={authed(<LeaderboardBoardsPage />)} />
      <Route path="/leaderboard/points" element={authed(<LeaderboardPointsPage />)} />
      <Route path="/leaderboard/settings" element={authed(<LeaderboardSettingsPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
