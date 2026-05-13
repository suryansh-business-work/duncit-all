export interface AdminSearchItem {
  title: string;
  description: string;
  to: string;
  keywords: string[];
}

export const ADMIN_SEARCH_ITEMS: AdminSearchItem[] = [
  {
    title: 'Dashboard',
    description: 'Live KPIs, charts and platform health overview.',
    to: '/dashboard',
    keywords: ['analytics', 'kpi', 'home'],
  },
  {
    title: 'Users',
    description: 'Manage user accounts, roles, permissions and activity.',
    to: '/users',
    keywords: ['members', 'customers', 'roles'],
  },
  {
    title: 'Support Logs',
    description: 'Review support tickets and contact submissions.',
    to: '/support-logs',
    keywords: ['tickets', 'help', 'contact'],
  },
  {
    title: 'Notifications',
    description: 'Create and review app notifications.',
    to: '/notifications',
    keywords: ['push', 'messages', 'engagement'],
  },
  {
    title: 'Marketing Campaigns',
    description: 'Schedule MJML email and WhatsApp fallback campaigns.',
    to: '/marketing/email-campaigns',
    keywords: ['campaigns', 'mjml', 'email', 'whatsapp', 'pods', 'clubs'],
  },
  {
    title: 'Clubs',
    description: 'Manage community clubs, pods and pod ideas.',
    to: '/clubs',
    keywords: ['community', 'pods', 'ideas'],
  },
  {
    title: 'Inventory',
    description: 'Manage Duncit products, stock and pod requests.',
    to: '/inventory',
    keywords: ['products', 'stock', 'catalog'],
  },
  {
    title: 'Finance',
    description: 'Open payments, fees, GST, invoices and payouts.',
    to: '/finance/dashboard',
    keywords: ['payments', 'ledger', 'payouts'],
  },
  {
    title: 'Branding',
    description: 'Update app identity, colors and support email.',
    to: '/branding',
    keywords: ['logo', 'theme', 'identity'],
  },
  {
    title: 'Settings',
    description: 'Configure global admin and app settings.',
    to: '/settings',
    keywords: ['system', 'config', 'preferences'],
  },
  {
    title: 'Profile',
    description: 'Update your admin profile and account details.',
    to: '/profile',
    keywords: ['account', 'me', 'admin'],
  },
];