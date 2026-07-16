import { Navigate, Route, Routes } from 'react-router-dom';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PodProfitCalculatorPage from './pages/calculators/pod-profit';
import {
  DefaultDeductionsPage,
  PodFinancePage,
  PodFinanceDetailPage,
  BackoutRefundPage,
  BackoutRefundDetailPage,
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

const authed = createAuthed({ getToken, wrap: (el) => <AppShell>{el}</AppShell> });

export default function App() {
  return (
    <Routes>
        <Route path="/profile" element={authed(<ProfilePage />)} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/startup-dashboard" element={authed(<StartupDashboardPage />)} />
      <Route path="/default-deductions" element={authed(<DefaultDeductionsPage />)} />
      <Route path="/pod-finance" element={authed(<PodFinancePage />)} />
      <Route path="/pod-finance/:podId" element={authed(<PodFinanceDetailPage />)} />
      <Route path="/backout-refunds" element={authed(<BackoutRefundPage />)} />
      <Route path="/backout-refunds/:id" element={authed(<BackoutRefundDetailPage />)} />
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
