import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import IntelAppShell from './components/IntelAppShell';
import ApprovalsPage from './pages/approvals';
import ChatPage from './pages/chat';
import ChatsPage from './pages/chats';
import KnowledgePage from './pages/knowledge';
import MediaPage from './pages/media';
import SettingsPage from './pages/settings';
import SyncPage from './pages/sync';
import { runtime } from './runtime';

const { LoginPage, session } = runtime;
const authed = createAuthed({ getToken: session.getToken, wrap: (el) => <IntelAppShell>{el}</IntelAppShell> });

/**
 * Duncit Intel's screens. Every one sits behind the shared portal login and its
 * own page error boundary (createAuthed), so one page failing never takes the
 * console down. Settings lives at /setting (and /setting/<section>).
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<ChatPage />)} />
      <Route path="/c/:conversationId" element={authed(<ChatPage />)} />
      <Route path="/chats" element={<Navigate to="/chats/recent" replace />} />
      <Route path="/chats/:view" element={authed(<ChatsPage />)} />
      <Route path="/media" element={authed(<MediaPage />)} />
      <Route path="/knowledge" element={authed(<KnowledgePage />)} />
      <Route path="/sync" element={authed(<SyncPage />)} />
      <Route path="/approvals" element={authed(<ApprovalsPage />)} />
      <Route path="/setting" element={authed(<SettingsPage />)} />
      <Route path="/setting/:section" element={authed(<SettingsPage />)} />
      <Route path="/settings" element={<Navigate to="/setting" replace />} />
      <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
