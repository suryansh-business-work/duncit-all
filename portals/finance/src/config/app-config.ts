/**
 * Per-app configuration. This is the single source of truth that makes the
 * shared shell (layout, login gating, theme accent, dashboard modules) behave
 * differently for each Duncit console. Everything here is reusable
 * configuration — no dynamic business data lives in this file.
 *
 * `requiredRoles` can be overridden at build/runtime via `VITE_REQUIRED_ROLES`
 * (comma separated) so access control stays dynamic without a code change.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
  key: 'finance',
  name: 'Finance',
  fullName: 'Duncit Finance',
  tagline: 'Track payouts, invoices and financial reconciliation.',
  promoTitle: "Numbers, clarified",
  promoText: "Payouts, invoices and reconciliation — all in one place.",
  portalLabel: 'Finance Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7869097/pexels-photo-7869097.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['FINANCE_MANAGER']),
  tokenKey: 'finance_token',
  colorModeKey: 'finance_color_mode',
  accent: { light: '#5eead4', main: '#0d9488', hover: '#0f766e', active: '#115e59' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Startup Dashboard', labelKey: 'shell.nav.startupDashboard', to: '/startup-dashboard', icon: 'insights' },
    { label: 'Default Deductions', labelKey: 'shell.nav.defaultDeductions', to: '/default-deductions', icon: 'percent' },
    { label: 'Pod Finance', labelKey: 'shell.nav.podFinance', to: '/pod-finance', icon: 'analytics' },
    {
      label: 'Cancel & Refunds', labelKey: 'shell.nav.cancelAndRefunds',
      icon: 'quote',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/cancellations', icon: 'dashboard' },
        { label: 'User Backout Refunds', labelKey: 'shell.nav.userBackoutRefunds', to: '/backout-refunds', icon: 'quote' },
        { label: 'Venue Cancel', labelKey: 'shell.nav.venueCancel', to: '/cancellations/venue', icon: 'storefront' },
        { label: 'Host Cancel', labelKey: 'shell.nav.hostCancel', to: '/cancellations/host', icon: 'receipt' },
      ],
    },
    { label: 'Payment Logs', labelKey: 'shell.nav.paymentLogs', to: '/payment-logs', icon: 'receipt' },
    { label: 'Payment Release', labelKey: 'shell.nav.paymentRelease', to: '/payment-release', icon: 'payments' },
    {
      label: 'Withdrawal', labelKey: 'shell.nav.withdrawal',
      icon: 'payments',
      children: [
        { label: 'Withdrawal Payments', labelKey: 'shell.nav.withdrawalPayments', to: '/withdrawals', icon: 'payments' },
        { label: 'Withdrawal Settings', labelKey: 'shell.nav.withdrawalSettings', to: '/withdrawals/settings', icon: 'tune' },
      ],
    },
    {
      label: 'Invoices', labelKey: 'shell.nav.invoices',
      icon: 'description',
      children: [
        { label: 'Business Identity', labelKey: 'shell.nav.businessIdentity', to: '/invoices', icon: 'description' },
        { label: 'Venue Invoice', labelKey: 'shell.nav.venueInvoice', to: '/invoices/venue', icon: 'storefront' },
        { label: 'Host Invoice', labelKey: 'shell.nav.hostInvoice', to: '/invoices/host', icon: 'description' },
        { label: 'Product Invoice', labelKey: 'shell.nav.productInvoice', to: '/invoices/product', icon: 'description' },
      ],
    },
    { label: 'Duncit Expenses', labelKey: 'shell.nav.duncitExpenses', to: '/ledger', icon: 'menuBook' },
    {
      label: 'Duncit Coin', labelKey: 'shell.nav.duncitCoin',
      icon: 'wallet',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/duncit-coin/dashboard', icon: 'insights' },
        { label: 'Transactions', labelKey: 'shell.nav.transactions', to: '/duncit-coin/transactions', icon: 'receipt' },
        { label: 'Coin Settings', labelKey: 'shell.nav.coinSettings', to: '/duncit-coin/settings', icon: 'tune' },
      ],
    },
    {
      label: 'Gift Cards', labelKey: 'shell.nav.giftCards',
      icon: 'wallet',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/gift-cards/dashboard', icon: 'insights' },
        { label: 'Cards', labelKey: 'shell.nav.cards', to: '/gift-cards/cards', icon: 'ticket' },
        { label: 'Logs', labelKey: 'shell.nav.logs', to: '/gift-cards/logs', icon: 'receipt' },
      ],
    },
    { label: 'Referrals', labelKey: 'shell.nav.referrals', to: '/referrals', icon: 'campaign' },
    { label: 'Payout Cycles', labelKey: 'shell.nav.payoutCycles', to: '/payouts', icon: 'calendar' },
    {
      label: 'Calculators', labelKey: 'shell.nav.calculators',
      icon: 'calculator',
      children: [
        { label: 'Pod Profit', labelKey: 'shell.nav.podProfit', to: '/calculators/pod-profit', icon: 'analytics' },
      ],
    },
  ],
  modules: [
    { title: 'Payouts', description: 'Review and release partner payouts.', icon: 'orders' },
    { title: 'Invoices', description: 'Generate and track invoices and GST.', icon: 'timeline' },
    { title: 'Reconciliation', description: 'Match settlements against the ledger.', icon: 'analytics' },
    { title: 'Reports', description: 'Revenue, fees and financial performance.', icon: 'insights' },
  ],
} satisfies AppConfig;
