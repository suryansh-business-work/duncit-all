/**
 * The meta-tag route table — one entry per mWeb page (src/app/AppRoutes.tsx).
 *
 * A NEW ROUTE IN AppRoutes.tsx NEEDS A ROW HERE TOO, plus its `mweb.meta.*`
 * keys in packages/i18n (rule 38). Dynamic rows name the `linkPreview` kind
 * that hydrates them; static rows just name their copy.
 */
export type PreviewKind = 'POD' | 'CLUB' | 'USER' | 'POST' | 'VENUE' | 'PRODUCT';

export interface StaticRoute {
  pattern: string;
  titleKey: string;
  descriptionKey?: string;
}

export interface DynamicRoute {
  pattern: string;
  kind: PreviewKind;
  /** Route params, in `linkPreview(id, secondary_id)` order. */
  idParams: string[];
  /** Wraps the entity title as {name} — e.g. "Post by {name}". */
  titleTemplateKey?: string;
  /** Used when the entity carries no description of its own. */
  descriptionKey: string;
}

/**
 * More specific than the static rows, so these are matched first. An entity
 * that cannot be resolved (deleted, private, bad id) falls all the way back to
 * the app's default card rather than a half-filled one.
 */
export const DYNAMIC_ROUTES: DynamicRoute[] = [
  {
    pattern: '/club/:clubSlug/pod/:podSlug',
    kind: 'POD',
    idParams: ['clubSlug', 'podSlug'],
    descriptionKey: 'mweb.meta.pod.description',
  },
  {
    pattern: '/pod/:podId/feedback',
    kind: 'POD',
    idParams: ['podId'],
    titleTemplateKey: 'mweb.meta.podFeedback.title',
    descriptionKey: 'mweb.meta.podFeedback.description',
  },
  {
    pattern: '/club/:clubSlug',
    kind: 'CLUB',
    idParams: ['clubSlug'],
    descriptionKey: 'mweb.meta.club.description',
  },
  {
    pattern: '/u/:userId',
    kind: 'USER',
    idParams: ['userId'],
    descriptionKey: 'mweb.meta.publicProfile.description',
  },
  {
    pattern: '/post/:postId',
    kind: 'POST',
    idParams: ['postId'],
    titleTemplateKey: 'mweb.meta.post.title',
    descriptionKey: 'mweb.meta.post.description',
  },
  {
    pattern: '/venue/:venueId',
    kind: 'VENUE',
    idParams: ['venueId'],
    descriptionKey: 'mweb.meta.venue.description',
  },
  {
    pattern: '/product/:productId',
    kind: 'PRODUCT',
    idParams: ['productId'],
    descriptionKey: 'mweb.meta.product.description',
  },
];

export const STATIC_ROUTES: StaticRoute[] = [
  { pattern: '/', titleKey: 'mweb.meta.home.title', descriptionKey: 'mweb.meta.home.description' },
  { pattern: '/menu', titleKey: 'mweb.meta.menu.title' },
  { pattern: '/profile', titleKey: 'mweb.meta.profile.title' },
  { pattern: '/follow', titleKey: 'mweb.meta.follow.title' },
  { pattern: '/account', titleKey: 'mweb.meta.account.title' },
  { pattern: '/venues', titleKey: 'mweb.meta.venues.title', descriptionKey: 'mweb.meta.venues.description' },
  { pattern: '/become-host', titleKey: 'mweb.meta.becomeHost.title' },
  { pattern: '/register-venue', titleKey: 'mweb.meta.registerVenue.title' },
  { pattern: '/survey/:kind', titleKey: 'mweb.meta.survey.title' },
  { pattern: '/hosts-venues', titleKey: 'mweb.meta.hostsVenues.title' },
  { pattern: '/host/dashboard', titleKey: 'mweb.meta.hostDashboard.title' },
  { pattern: '/verification', titleKey: 'mweb.meta.verification.title' },
  { pattern: '/host/manage', titleKey: 'mweb.meta.hostManage.title' },
  { pattern: '/host/apply', titleKey: 'mweb.meta.hostApply.title' },
  { pattern: '/host/wallet', titleKey: 'mweb.meta.wallet.title' },
  { pattern: '/create-pod', titleKey: 'mweb.meta.createPod.title' },
  { pattern: '/create-pod/:draftId', titleKey: 'mweb.meta.createPod.title' },
  { pattern: '/host/pod-pending/:podId', titleKey: 'mweb.meta.podPending.title' },
  { pattern: '/earn', titleKey: 'mweb.meta.earn.title', descriptionKey: 'mweb.meta.earn.description' },
  { pattern: '/tour-guide', titleKey: 'mweb.meta.tourGuide.title' },
  { pattern: '/products/manage', titleKey: 'mweb.meta.productsManage.title' },
  { pattern: '/venues/manage', titleKey: 'mweb.meta.venuesManage.title' },
  { pattern: '/venues/earnings', titleKey: 'mweb.meta.venueEarnings.title' },
  { pattern: '/venues/slot-requests', titleKey: 'mweb.meta.slotRequests.title' },
  { pattern: '/venues/:venueId/health', titleKey: 'mweb.meta.venueHealth.title' },
  { pattern: '/clubs/manage', titleKey: 'mweb.meta.clubStudio.title' },
  { pattern: '/faqs', titleKey: 'mweb.meta.faqs.title' },
  { pattern: '/policies/:slug', titleKey: 'mweb.meta.policies.title' },
  { pattern: '/pod-ideas', titleKey: 'mweb.meta.podIdeas.title', descriptionKey: 'mweb.meta.podIdeas.description' },
  { pattern: '/referral', titleKey: 'mweb.meta.referral.title', descriptionKey: 'mweb.meta.referral.description' },
  { pattern: '/duncit-coin', titleKey: 'mweb.meta.coin.title' },
  { pattern: '/leaderboard', titleKey: 'mweb.meta.leaderboard.title' },
  { pattern: '/membership', titleKey: 'mweb.meta.membership.title', descriptionKey: 'mweb.meta.membership.description' },
  { pattern: '/gift-cards', titleKey: 'mweb.meta.giftCards.title', descriptionKey: 'mweb.meta.giftCards.description' },
  { pattern: '/gift-cards/checkout', titleKey: 'mweb.meta.giftCardsCheckout.title' },
  { pattern: '/gift-cards/redeem', titleKey: 'mweb.meta.giftCardRedeem.title', descriptionKey: 'mweb.meta.giftCardRedeem.description' },
  // Static on purpose — the claim page must never leak card data to crawlers.
  { pattern: '/gift-card/:code', titleKey: 'mweb.meta.giftCardClaim.title', descriptionKey: 'mweb.meta.giftCardClaim.description' },
  { pattern: '/pod-plans', titleKey: 'mweb.meta.podPlans.title' },
  { pattern: '/pod-history', titleKey: 'mweb.meta.podHistory.title' },
  { pattern: '/pod-history/:membershipId', titleKey: 'mweb.meta.podHistory.title' },
  { pattern: '/booking/:bookingId', titleKey: 'mweb.meta.booking.title' },
  { pattern: '/support', titleKey: 'mweb.meta.support.title' },
  { pattern: '/support/sos', titleKey: 'mweb.meta.sos.title' },
  { pattern: '/support/callback', titleKey: 'mweb.meta.callback.title' },
  { pattern: '/support/tickets', titleKey: 'mweb.meta.supportTickets.title' },
  { pattern: '/support/live', titleKey: 'mweb.meta.liveTickets.title' },
  { pattern: '/support/all', titleKey: 'mweb.meta.allTickets.title' },
  { pattern: '/support/feedback', titleKey: 'mweb.meta.feedback.title' },
  { pattern: '/support/grievance', titleKey: 'mweb.meta.grievance.title' },
  { pattern: '/support/chat', titleKey: 'mweb.meta.liveTickets.title' },
  { pattern: '/tickets', titleKey: 'mweb.meta.liveTickets.title' },
  { pattern: '/tickets/:id', titleKey: 'mweb.meta.ticket.title' },
  { pattern: '/live-chat', titleKey: 'mweb.meta.liveChat.title' },
  { pattern: '/bouncers', titleKey: 'mweb.meta.support.title' },
  { pattern: '/account/health', titleKey: 'mweb.meta.accountHealth.title' },
  { pattern: '/account/mail-preference', titleKey: 'mweb.meta.mailPreference.title' },
  { pattern: '/unsubscribe', titleKey: 'mweb.meta.mailPreference.title' },
  { pattern: '/signup-survey', titleKey: 'mweb.meta.signupSurvey.title' },
  { pattern: '/signup-whatsapp', titleKey: 'mweb.meta.signupWhatsapp.title' },
  { pattern: '/signup-referral', titleKey: 'mweb.meta.signupReferral.title' },
  { pattern: '/checkout', titleKey: 'mweb.meta.checkout.title' },
  { pattern: '/checkout/:podId', titleKey: 'mweb.meta.checkout.title' },
  { pattern: '/product-checkout', titleKey: 'mweb.meta.checkout.title' },
  { pattern: '/cart', titleKey: 'mweb.meta.cart.title' },
  { pattern: '/shop', titleKey: 'mweb.meta.shop.title', descriptionKey: 'mweb.meta.shop.description' },
  { pattern: '/orders', titleKey: 'mweb.meta.orders.title' },
  { pattern: '/address-book', titleKey: 'mweb.meta.addressBook.title' },
  { pattern: '/explore', titleKey: 'mweb.meta.explore.title', descriptionKey: 'mweb.meta.explore.description' },
  { pattern: '/previous-pods', titleKey: 'mweb.meta.previousPods.title' },
  { pattern: '/happening-nearby', titleKey: 'mweb.meta.happeningNearby.title' },
  { pattern: '/search', titleKey: 'mweb.meta.search.title' },
  { pattern: '/saved', titleKey: 'mweb.meta.saved.title' },
  { pattern: '/clubs', titleKey: 'mweb.meta.clubs.title' },
  { pattern: '/chats', titleKey: 'mweb.meta.chats.title' },
  { pattern: '/chats/:id', titleKey: 'mweb.meta.chats.title' },
  { pattern: '/register', titleKey: 'mweb.meta.register.title', descriptionKey: 'mweb.meta.register.description' },
  { pattern: '/login', titleKey: 'mweb.meta.login.title' },
  { pattern: '/forgot-password', titleKey: 'mweb.meta.forgotPassword.title' },
  { pattern: '/reset-password', titleKey: 'mweb.meta.resetPassword.title' },
];

/** `/club/x/pod/y` against `/club/:clubSlug/pod/:podSlug` → captured params. */
export function matchPattern(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (const [index, part] of patternParts.entries()) {
    const value = pathParts[index];
    if (value === undefined) return null;
    if (part.startsWith(':')) params[part.slice(1)] = value;
    else if (part !== value) return null;
  }
  return params;
}
