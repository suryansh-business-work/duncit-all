import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage, createAuthed } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChallengesPage from './pages/challenges/ChallengesPage';
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
      <Route path="/challenges" element={authed(<ChallengesPage />)} />
      <Route path="/leaderboard" element={authed(<LeaderboardBoardsPage />)} />
      <Route path="/leaderboard/points" element={authed(<LeaderboardPointsPage />)} />
      <Route path="/leaderboard/settings" element={authed(<LeaderboardSettingsPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
