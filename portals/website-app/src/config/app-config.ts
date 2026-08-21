import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'website-app',
  name: 'Website',
  fullName: 'Duncit Website',
  tagline: 'Manage website content, pages and publishing.',
  promoTitle: "Your site, managed",
  promoText: "Publish content, careers and updates from one place.",
  portalLabel: 'Website Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/8524940/pexels-photo-8524940.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['WEBSITE_MANAGER']),
  tokenKey: 'website_app_token',
  colorModeKey: 'website_app_color_mode',
  accent: { light: '#93c5fd', main: '#2563eb', hover: '#1d4ed8', active: '#1e40af' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Career', labelKey: 'shell.nav.career', to: '/careers', icon: 'work' },
    { label: 'Newsroom', labelKey: 'shell.nav.newsroom', to: '/newsroom', icon: 'newspaper' },
    { label: 'Blog', labelKey: 'shell.nav.blog', to: '/blog', icon: 'article' },
    { label: 'Newsletter Submission', labelKey: 'shell.nav.newsletterSubmission', to: '/newsletter', icon: 'email' },
    { label: 'Contact Submission', labelKey: 'shell.nav.contactSubmission', to: '/contact-submissions', icon: 'contactMail' },
    { label: 'FAQ Submission', labelKey: 'shell.nav.faqSubmission', to: '/faq-submissions', icon: 'help' },
    { label: 'Job Applications', labelKey: 'shell.nav.jobApplications', to: '/job-applications', icon: 'personSearch' },
    { label: 'Navigation', labelKey: 'shell.nav.navigation', to: '/navigation', icon: 'accountTree' },
  ],
  modules: [],
} satisfies AppConfig;
