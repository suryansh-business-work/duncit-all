import { Navigate, Route, Routes } from 'react-router';
import { ProfilePage, createAuthed } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import PromptLibraryPage from './pages/prompt-library';
import PublicPromptPage from './pages/public-prompt';
import OpenAiDashboardPage from './pages/openai-dashboard';
import OpenAiLogsPage from './pages/openai-logs';
import AiFeaturesPage from './pages/ai-features';
import AiFeatureDetailPage from './pages/ai-features/detail';
import AiFeaturesDashboardPage from './pages/ai-features-dashboard';
import AiLibraryDashboardPage from './pages/library-dashboard';
import AiMonitoringLogsPage from './pages/ai-monitoring/logs';
import AiMonitoringSettingsPage from './pages/ai-monitoring/settings';
import AutomationFlowsPage from './pages/automation/flows-list';
import AutomationBuilderPage from './pages/automation/builder';
import ReelStudioMovedPage from './pages/reels-moved';
import { askDuncitRoutes } from './pages/ask-duncit/routes';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      {/* A shared prompt: public by design, the share token is the gate. */}
      <Route path="/p/:token" element={<PublicPromptPage />} />
      <Route path="/" element={authed(<WelcomePage />)} />
      <Route path="/library" element={authed(<PromptLibraryPage />)} />
      <Route path="/library/dashboard" element={authed(<AiLibraryDashboardPage />)} />
      <Route path="/ai-features" element={authed(<AiFeaturesPage />)} />
      {/* Before /:key; a static segment outranks a param in react-router anyway. */}
      <Route path="/ai-features/dashboard" element={authed(<AiFeaturesDashboardPage />)} />
      <Route path="/ai-features/:key" element={authed(<AiFeatureDetailPage />)} />
      <Route path="/openai" element={authed(<OpenAiDashboardPage />)} />
      <Route path="/openai/logs" element={authed(<OpenAiLogsPage />)} />
      <Route path="/monitoring" element={authed(<AiMonitoringLogsPage />)} />
      <Route path="/monitoring/settings" element={authed(<AiMonitoringSettingsPage />)} />
      {askDuncitRoutes(authed)}
      <Route path="/automation/:channel" element={authed(<AutomationFlowsPage />)} />
      <Route path="/automation/:channel/:flowId" element={authed(<AutomationBuilderPage />)} />
      {/* Reel Studio moved to the Marketing console; the old addresses point there. */}
      <Route path="/reels" element={authed(<ReelStudioMovedPage />)} />
      <Route path="/reels/:projectId" element={authed(<ReelStudioMovedPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
