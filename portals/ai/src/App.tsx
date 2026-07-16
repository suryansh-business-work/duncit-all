import { Navigate, Route, Routes } from 'react-router-dom';
import { ProfilePage, createAuthed } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import PromptLibraryPage from './pages/prompt-library';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<WelcomePage />)} />
      <Route path="/library" element={authed(<PromptLibraryPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
