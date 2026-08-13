import type { NavigationPage } from './askBot.catalog';

/**
 * The public Astro sites. Small, but the bot is asked about them — "where do we
 * publish the safety policy" has an answer on duncit.com and a different answer
 * in the Website console, and knowing both is the point of listing them.
 */
export const WEBSITE_PAGES: readonly NavigationPage[] = [
  // ---- duncit.com (website) --------------------------------------------
  { surface: 'website', path: '/', label: 'Home',
    description: 'The public landing page — what Duncit is, how pods work, and the links into the app stores.' },
  { surface: 'website', path: '/about', label: 'About us',
    description: 'The company story, what Duncit is building and who it is for.' },
  { surface: 'website', path: '/community', label: 'Community',
    description: 'How the Duncit community works and what people do in it.' },
  { surface: 'website', path: '/guidelines', label: 'Community Guidelines',
    description: 'The public rules of conduct every member agrees to.' },
  { surface: 'website', path: '/safety/approach', label: 'Our Safety Approach',
    description: 'How Duncit thinks about member safety and what it does about it.' },
  { surface: 'website', path: '/safety/tools', label: 'Safety Tools',
    description: 'The safety features members can use — blocking, reporting and the rest.' },
  { surface: 'website', path: '/safety/advice', label: 'Safety Advice',
    description: 'Practical advice for members meeting people at a pod for the first time.' },
  { surface: 'website', path: '/safety/resources', label: 'Crisis Resources',
    description: 'Emergency and crisis helpline numbers for members who need them.' },
  { surface: 'website', path: '/help', label: 'Help Center',
    description: 'The public help centre — how to use Duncit, answers by topic.' },
  { surface: 'website', path: '/faq', label: 'FAQ',
    description: 'Frequently asked questions, published from the FAQs managed in the Admin console.' },
  { surface: 'website', path: '/contact', label: 'Contact us',
    description: 'The public contact form; submissions land in the Admin/Support inbox.' },
  { surface: 'website', path: '/grievance', label: 'Grievance',
    description: 'File a formal grievance; it is worked from the Support and Legal consoles.' },
  { surface: 'website', path: '/policies', label: 'Policy Hub',
    description: 'Index of every published policy — terms, privacy, refunds and the rest.' },
  { surface: 'website', path: '/policy/:slug', label: 'A single policy',
    description: 'One published policy document, by its slug. The copy is edited in the Website console.' },
  { surface: 'website', path: '/blog', label: 'Blog',
    description: 'The public blog index; posts are written in the Website console.' },
  { surface: 'website', path: '/newsroom', label: 'Newsroom',
    description: 'Press releases and company announcements.' },
  { surface: 'website', path: '/careers', label: 'Careers',
    description: 'Open roles at Duncit; applications land in the HR console.' },

  // ---- Partners website (partners-website) ------------------------------
  { surface: 'partners-website', path: '/', label: 'Partners home',
    description: 'The public pitch to hosts, venues, e-commerce brands and club admins, and the sign-in link into the Partners App.' },

  // ---- Earn with Duncit (earnwith-website) ------------------------------
  { surface: 'earnwith-website', path: '/', label: 'Earn with Duncit',
    description: 'The public landing page explaining the ways to earn with Duncit and where to apply.' },

  // ---- Advertise with Duncit (ads-website) ------------------------------
  { surface: 'ads-website', path: '/', label: 'Advertise with Duncit',
    description: 'The public landing page for advertisers — separate from the Ads console, which is where campaigns are actually run.' },
];
