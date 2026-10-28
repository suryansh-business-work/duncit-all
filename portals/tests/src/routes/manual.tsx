import { Navigate, Route } from 'react-router';
import ManualBoardPage from '../pages/manual/board';
import ManualCasesPage from '../pages/manual/cases';
import ManualCaseDetailPage from '../pages/manual/case-detail';
import ManualSettingsPage from '../pages/manual/settings';
import type { Authed } from './types';

/** Manual Testing: the drag-and-drop board, every case as a table, one case, and the board's columns. */
export function manualRoutes(authed: Authed) {
  return (
    <>
      <Route path="/manual" element={<Navigate to="/manual/board" replace />} />
      <Route path="/manual/board" element={authed(<ManualBoardPage />)} />
      <Route path="/manual/cases" element={authed(<ManualCasesPage />)} />
      {/* One case at its own address, by its key (QA-12): what people paste. */}
      <Route path="/manual/cases/:caseKey" element={authed(<ManualCaseDetailPage />)} />
      <Route path="/manual/settings" element={authed(<ManualSettingsPage />)} />
    </>
  );
}
