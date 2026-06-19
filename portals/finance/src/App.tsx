import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PodProfitCalculatorPage from './pages/calculators/pod-profit';
import {
  DefaultDeductionsPage,
  PaymentLogsPage,
  PaymentReleasePage,
  WithdrawalsPage,
  InvoiceManagementPage,
  InvoiceTemplatePage,
  LedgerPage,
  PayoutCyclesPage,
  StartupDashboardPage,
} from './pages/finance';
import AppShell from './components/AppShell';
import { getToken } from './lib/session';
import { redirectPathFromLocation } from './utils/redirect';

function RequireAuth({ children }: Readonly<{ children: JSX.Element }>) {
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
      <Route path="/startup-dashboard" element={authed(<StartupDashboardPage />)} />
      <Route path="/default-deductions" element={authed(<DefaultDeductionsPage />)} />
      <Route path="/payment-logs" element={authed(<PaymentLogsPage />)} />
      <Route path="/payment-release" element={authed(<PaymentReleasePage />)} />
      <Route path="/withdrawals" element={authed(<WithdrawalsPage />)} />
      <Route path="/invoices" element={authed(<InvoiceManagementPage />)} />
      <Route path="/invoices/venue" element={authed(<InvoiceTemplatePage kind="venue" />)} />
      <Route path="/invoices/host" element={authed(<InvoiceTemplatePage kind="host" />)} />
      <Route path="/invoices/product" element={authed(<InvoiceTemplatePage kind="product" />)} />
      <Route path="/ledger" element={authed(<LedgerPage />)} />
      <Route path="/payouts" element={authed(<PayoutCyclesPage />)} />
      <Route path="/calculators/pod-profit" element={authed(<PodProfitCalculatorPage />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
