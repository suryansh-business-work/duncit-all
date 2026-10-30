import { Navigate, Route, Routes } from 'react-router';
import { createAuthed, ProfilePage } from '@duncit/shell';
import LoyaltyAppShell from './components/LoyaltyAppShell';
import DashboardPage from './pages/dashboard/DashboardPage';
import {
  CoinDashboardPage,
  CoinSettingsPage,
  CoinTransactionDetailPage,
  CoinTransactionsPage,
} from './pages/duncit-coin';
import { ReferralDashboardPage, ReferralHistoryPage, ReferralSettingsPage } from './pages/referrals';
import { SmartIncentiveDashboardPage, SmartIncentiveSettingsPage } from './pages/smart-incentive';
import {
  GiftCardCardsPage,
  GiftCardDashboardPage,
  GiftCardDetailPage,
  GiftCardLogsPage,
} from './pages/gift-cards/virtual';
import {
  PhysicalBatchDetailPage,
  PhysicalBatchesPage,
  PhysicalCardDetailPage,
  PhysicalCardsPage,
  PhysicalDashboardPage,
  PhysicalGeneratePage,
  PhysicalHistoryPage,
} from './pages/gift-cards/physical';
import { runtime } from './runtime';

const { LoginPage, session } = runtime;
const authed = createAuthed({ getToken: session.getToken, wrap: (el) => <LoyaltyAppShell>{el}</LoyaltyAppShell> });

/** Where a virtual card's own page lives — the cards and logs tables open it. */
const virtualCardPath = (id: string) => `/gift-cards/virtual/cards/${id}`;

/**
 * The Loyalty console's screens. Every one sits behind the login gate and its
 * own page error boundary (createAuthed), so one failing screen never takes the
 * console down.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={authed(<DashboardPage />)} />
      <Route path="/profile" element={authed(<ProfilePage />)} />

      <Route path="/duncit-coin/dashboard" element={authed(<CoinDashboardPage />)} />
      <Route path="/duncit-coin/transactions" element={authed(<CoinTransactionsPage />)} />
      <Route path="/duncit-coin/transactions/:id" element={authed(<CoinTransactionDetailPage />)} />
      <Route path="/duncit-coin/settings" element={authed(<CoinSettingsPage />)} />

      <Route path="/referrals/dashboard" element={authed(<ReferralDashboardPage />)} />
      <Route path="/referrals/history" element={authed(<ReferralHistoryPage />)} />
      <Route path="/referrals/settings" element={authed(<ReferralSettingsPage />)} />

      <Route path="/smart-incentive/dashboard" element={authed(<SmartIncentiveDashboardPage />)} />
      <Route path="/smart-incentive/settings" element={authed(<SmartIncentiveSettingsPage />)} />

      <Route path="/gift-cards/virtual/dashboard" element={authed(<GiftCardDashboardPage />)} />
      <Route path="/gift-cards/virtual/cards" element={authed(<GiftCardCardsPage cardPath={virtualCardPath} />)} />
      <Route path="/gift-cards/virtual/cards/:id" element={authed(<GiftCardDetailPage />)} />
      <Route path="/gift-cards/virtual/logs" element={authed(<GiftCardLogsPage cardPath={virtualCardPath} />)} />

      <Route path="/gift-cards/physical/dashboard" element={authed(<PhysicalDashboardPage />)} />
      <Route path="/gift-cards/physical/generate" element={authed(<PhysicalGeneratePage />)} />
      <Route path="/gift-cards/physical/cards" element={authed(<PhysicalCardsPage />)} />
      <Route path="/gift-cards/physical/cards/:id" element={authed(<PhysicalCardDetailPage />)} />
      <Route path="/gift-cards/physical/batches" element={authed(<PhysicalBatchesPage />)} />
      <Route path="/gift-cards/physical/batches/:id" element={authed(<PhysicalBatchDetailPage />)} />
      <Route path="/gift-cards/physical/history" element={authed(<PhysicalHistoryPage />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
