import type { ReactElement } from 'react';
import { Route } from 'react-router';
import AskDuncitDashboardPage from './dashboard';
import AskDuncitLivePage from './live';
import AskDuncitLogsPage from './logs';
import AskDuncitOutOfContextPage from './out-of-context';
import AskDuncitViolationsPage from './violations';
import AskDuncitToolsPage from './tools';
import AskDuncitKnowledgePage from './knowledge';
import AskDuncitModelsPage from './models';
import AskDuncitPromptsPage from './prompts';
import AskDuncitFeedbackPage from './feedback';
import AskDuncitCostPage from './cost';
import AskDuncitFlagsPage from './flags';
import AskDuncitControlCenterPage from './control-center';

const PAGES: ReadonlyArray<[string, () => ReactElement]> = [
  ['/ask-duncit', () => <AskDuncitDashboardPage />],
  ['/ask-duncit/live', () => <AskDuncitLivePage />],
  ['/ask-duncit/logs', () => <AskDuncitLogsPage />],
  ['/ask-duncit/out-of-context', () => <AskDuncitOutOfContextPage />],
  ['/ask-duncit/violations', () => <AskDuncitViolationsPage />],
  ['/ask-duncit/tools', () => <AskDuncitToolsPage />],
  ['/ask-duncit/knowledge', () => <AskDuncitKnowledgePage />],
  ['/ask-duncit/models', () => <AskDuncitModelsPage />],
  ['/ask-duncit/prompts', () => <AskDuncitPromptsPage />],
  ['/ask-duncit/feedback', () => <AskDuncitFeedbackPage />],
  ['/ask-duncit/cost', () => <AskDuncitCostPage />],
  ['/ask-duncit/flags', () => <AskDuncitFlagsPage />],
  ['/ask-duncit/control-center', () => <AskDuncitControlCenterPage />],
];

/** The AI portal's Ask Duncit section, each page inside the authenticated shell. */
export function askDuncitRoutes(authed: (element: ReactElement) => ReactElement) {
  return PAGES.map(([path, page]) => <Route key={path} path={path} element={authed(page())} />);
}
