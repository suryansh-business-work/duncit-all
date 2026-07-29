import type { EarnJourney } from './types';

/** The partner portal origin — where an approved partner's next step lives. */
export const PARTNER_PORTAL_URL = 'https://partners-app.duncit.com';

/**
 * The four Earn With Duncit journeys, in display order. One definition for
 * mWeb, native and the partner portal: the copy, the role that unlocks each
 * card, the MeetingKind it books and both route shapes.
 */
export const EARN_JOURNEYS: readonly EarnJourney[] = [
  {
    role: 'HOST',
    kind: 'HOST',
    title: 'By hosting a pod',
    description: 'Run meetups and experiences for your community and earn from paid pods.',
    iconKey: 'host',
    surveyPath: '/survey/host',
    nativeRoute: 'BecomeHost',
    // In-app: Host Studio → "Ready to Host More Experiences" → Apply Now.
    cta: {
      target: 'internal',
      label: 'Ready to host more experiences?',
      internalTo: '/host/manage',
      internalRoute: 'HostManage',
    },
  },
  {
    role: 'VENUE_OWNER',
    kind: 'VENUE',
    title: 'By registering your venue',
    description: 'List your space as a Duncit venue and host pods or rent it out.',
    iconKey: 'venue',
    surveyPath: '/survey/venue',
    nativeRoute: 'RegisterVenue',
    cta: { target: 'partner', label: 'Ready to register another venue?', partnerPath: '/register-venue/new' },
  },
  {
    role: 'ECOMM_MANAGER',
    kind: 'ECOMM',
    title: 'By listing your product',
    description: 'Sell your products to the Duncit community through pods and the shop.',
    iconKey: 'ecomm',
    surveyPath: '/survey/ecomm',
    nativeRoute: 'ListProduct',
    cta: { target: 'partner', label: 'Ready to add another brand?', partnerPath: '/ecomm-brand' },
  },
  {
    role: 'CLUB_ADMIN',
    kind: 'CLUB_ADMIN',
    title: 'By managing a club',
    description: 'Run a Duncit club and manage its pods and members as a club admin.',
    iconKey: 'club',
    surveyPath: '/survey/club_admin',
    nativeRoute: 'BeClubAdmin',
    cta: { target: 'partner', label: 'Manage your clubs', partnerPath: '/club-admin/dashboard' },
  },
];

/** Absolute URL for a journey CTA that lives on the partner portal. */
export function partnerPortalUrl(path: string): string {
  return `${PARTNER_PORTAL_URL}${path}`;
}
