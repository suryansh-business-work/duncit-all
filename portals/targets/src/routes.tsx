import { Route } from 'react-router';
import type { createAuthed } from '@duncit/shell';
import GrowthCalculatorPage from './pages/growth/GrowthCalculatorPage';

/** The console's screens, beside the dashboard and profile every console has. */
export function targetsRoutes(authed: ReturnType<typeof createAuthed>) {
  return <Route path="/growth-calculator" element={authed(<GrowthCalculatorPage />)} />;
}
