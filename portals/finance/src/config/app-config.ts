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
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'Startup Dashboard', to: '/startup-dashboard', icon: 'insights' },
    { label: 'Default Deductions', to: '/default-deductions', icon: 'percent' },
    { label: 'Pod Finance', to: '/pod-finance', icon: 'analytics' },
    { label: 'Backout Refunds', to: '/backout-refunds', icon: 'quote' },
    { label: 'Payment Logs', to: '/payment-logs', icon: 'receipt' },
    { label: 'Payment Release', to: '/payment-release', icon: 'payments' },
    { label: 'Withdrawals', to: '/withdrawals', icon: 'payments' },
    {
      label: 'Invoices',
      icon: 'description',
      children: [
        { label: 'Business Identity', to: '/invoices', icon: 'description' },
        { label: 'Venue Invoice', to: '/invoices/venue', icon: 'storefront' },
        { label: 'Host Invoice', to: '/invoices/host', icon: 'description' },
        { label: 'Product Invoice', to: '/invoices/product', icon: 'description' },
      ],
    },
    { label: 'Duncit Expenses', to: '/ledger', icon: 'menuBook' },
    { label: 'Payout Cycles', to: '/payouts', icon: 'calendar' },
    {
      label: 'Calculators',
      icon: 'calculator',
      children: [
        { label: 'Pod Profit', to: '/calculators/pod-profit', icon: 'analytics' },
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
