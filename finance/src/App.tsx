import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PodProfitCalculatorPage from './pages/calculators/pod-profit';
import {
  FinanceSettingsPage,
  PlatformFeesPage,
  GstManagementPage,
  PaymentLogsPage,
  PaymentReleasePage,
  InvoiceManagementPage,
  LedgerPage,
  VenueFinancePage,
  InsuranceManagementPage,
  PayoutCyclesPage,
} from './pages/finance';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';
import { redirectPathFromLocation } from './utils/redirect';

function RequireAuth({ children }: { children: JSX.Element }) {
  const location = useLocation();
  if (!getToken()) {
    const redirect = encodeURIComponent(redirectPathFromLocation(location));
    return <Navigate to={`/login?redirect=${redirect}`} replace state={{ from: location }} />;
  }
  return children;
}

const authed = (element: JSX.Element) => (
  <RequireAuth>
    <AppShell>{element}</AppShell>
  </RequireAuth>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/settings" element={authed(<FinanceSettingsPage />)} />
      <Route path="/platform-fees" element={authed(<PlatformFeesPage />)} />
      <Route path="/gst" element={authed(<GstManagementPage />)} />
      <Route path="/payment-logs" element={authed(<PaymentLogsPage />)} />
      <Route path="/payment-release" element={authed(<PaymentReleasePage />)} />
      <Route path="/invoices" element={authed(<InvoiceManagementPage />)} />
      <Route path="/ledger" element={authed(<LedgerPage />)} />
      <Route path="/venue" element={authed(<VenueFinancePage />)} />
      <Route path="/insurance" element={authed(<InsuranceManagementPage />)} />
      <Route path="/payouts" element={authed(<PayoutCyclesPage />)} />
      <Route path="/calculators/pod-profit" element={authed(<PodProfitCalculatorPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
