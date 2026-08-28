import type { TourDefinition, TourId } from './types';

/** The tour that runs itself once, right after a user's first signup. */
export const HOME_TOUR_ID: TourId = 'home';

/**
 * Every guided tour, in the order the Tour Guide centre lists them. Adding a
 * screen is one entry here plus the matching `data-tour` / registered anchors —
 * no change to either overlay, which is the "extensible for future screens"
 * requirement.
 *
 * Structure only: which element a step points at, where the tour lands and who
 * may see it. The words live in `mweb.tours.*` (CLAUDE.md rule 38) and are
 * resolved by whichever overlay is drawing — so mWeb and native cannot describe
 * the same screen differently, and a tour translates like everything else.
 * Keys are written out in full because `verify-translation-keys.mjs` greps
 * source for the literal string; a key built from `id` would read as unrendered.
 */
export const TOURS: readonly TourDefinition[] = [
  {
    id: 'home',
    titleKey: 'mweb.tours.home.title',
    captionKey: 'mweb.tours.home.caption',
    path: '/',
    nativeRoute: 'Home',
    steps: [
      {
        anchor: 'home-pods',
        titleKey: 'mweb.tours.home.pods.title',
        bodyKey: 'mweb.tours.home.pods.body',
      },
      {
        anchor: 'home-clubs',
        titleKey: 'mweb.tours.home.clubs.title',
        bodyKey: 'mweb.tours.home.clubs.body',
      },
      {
        anchor: 'home-search',
        titleKey: 'mweb.tours.home.search.title',
        bodyKey: 'mweb.tours.home.search.body',
      },
      {
        anchor: 'home-categories',
        titleKey: 'mweb.tours.home.categories.title',
        bodyKey: 'mweb.tours.home.categories.body',
      },
      {
        anchor: 'home-filters',
        titleKey: 'mweb.tours.home.filters.title',
        bodyKey: 'mweb.tours.home.filters.body',
      },
      {
        anchor: 'home-notifications',
        titleKey: 'mweb.tours.home.notifications.title',
        bodyKey: 'mweb.tours.home.notifications.body',
      },
      {
        anchor: 'home-profile',
        titleKey: 'mweb.tours.home.profile.title',
        bodyKey: 'mweb.tours.home.profile.body',
      },
    ],
  },
  {
    id: 'club',
    titleKey: 'mweb.tours.club.title',
    captionKey: 'mweb.tours.club.caption',
    path: '/clubs',
    nativeRoute: 'Home',
    nativeTab: 'Clubs',
    steps: [
      {
        // The follower count is a clause this step used to promise and only mWeb
        // could keep: on native it sits below the Follow pill, so covering it
        // would have swallowed the next step's target.
        anchor: 'club-header',
        titleKey: 'mweb.tours.club.header.title',
        bodyKey: 'mweb.tours.club.header.body',
      },
      {
        anchor: 'club-follow',
        titleKey: 'mweb.tours.club.follow.title',
        bodyKey: 'mweb.tours.club.follow.body',
      },
      {
        anchor: 'club-pods',
        titleKey: 'mweb.tours.club.pods.title',
        bodyKey: 'mweb.tours.club.pods.body',
      },
    ],
  },
  {
    id: 'pod-details',
    titleKey: 'mweb.tours.podDetails.title',
    captionKey: 'mweb.tours.podDetails.caption',
    path: '/',
    nativeRoute: 'Home',
    steps: [
      {
        anchor: 'pod-summary',
        titleKey: 'mweb.tours.podDetails.summary.title',
        bodyKey: 'mweb.tours.podDetails.summary.body',
      },
      {
        anchor: 'pod-spots',
        titleKey: 'mweb.tours.podDetails.spots.title',
        bodyKey: 'mweb.tours.podDetails.spots.body',
      },
      {
        anchor: 'pod-book',
        titleKey: 'mweb.tours.podDetails.book.title',
        bodyKey: 'mweb.tours.podDetails.book.body',
      },
    ],
  },
  {
    id: 'create-pod',
    titleKey: 'mweb.tours.createPod.title',
    captionKey: 'mweb.tours.createPod.caption',
    path: '/create-pod',
    nativeRoute: 'CreatePod',
    requiredRole: 'HOST',
    /*
      Every step lives on the FIRST page of the wizard, and that is deliberate.
      Create Pod renders one page at a time (`{steps[step]}`), so an anchor on
      the venue page or the pricing page is never on screen at the same time as
      one on the basics page. Both runners resolve a tour against what is
      rendered and then freeze — so steps pointing at later pages did not merely
      arrive late, they could never resolve, and the tour would open on its one
      reachable step and mark itself as shown. The walkthrough therefore explains
      the journey from the page the host actually lands on.
    */
    steps: [
      {
        anchor: 'create-pod-steps',
        titleKey: 'mweb.tours.createPod.steps.title',
        bodyKey: 'mweb.tours.createPod.steps.body',
      },
      {
        anchor: 'create-pod-basics',
        titleKey: 'mweb.tours.createPod.basics.title',
        bodyKey: 'mweb.tours.createPod.basics.body',
      },
      {
        anchor: 'create-pod-publish',
        titleKey: 'mweb.tours.createPod.publish.title',
        bodyKey: 'mweb.tours.createPod.publish.body',
      },
    ],
  },
  {
    id: 'profile',
    titleKey: 'mweb.tours.profile.title',
    captionKey: 'mweb.tours.profile.caption',
    // The menu, not the account screen. Pod history and Earn have never lived on
    // /account — they are menu tiles — so two of these three steps had nothing
    // to point at and the tour did nothing but navigate. The menu is a real
    // route on both surfaces (it used to be a drawer), so it opens cold.
    path: '/menu',
    nativeRoute: 'Menu',
    steps: [
      {
        anchor: 'profile-details',
        titleKey: 'mweb.tours.profile.details.title',
        bodyKey: 'mweb.tours.profile.details.body',
      },
      {
        anchor: 'profile-history',
        titleKey: 'mweb.tours.profile.history.title',
        bodyKey: 'mweb.tours.profile.history.body',
      },
      {
        anchor: 'profile-earn',
        titleKey: 'mweb.tours.profile.earn.title',
        bodyKey: 'mweb.tours.profile.earn.body',
      },
    ],
  },
  {
    id: 'booking',
    titleKey: 'mweb.tours.booking.title',
    captionKey: 'mweb.tours.booking.caption',
    path: '/pod-history',
    nativeRoute: 'PodHistory',
    /*
      All three steps are on the booking DETAIL screen, which is the only place
      the ticket and back-out controls exist. A step on the list screen would
      resolve on its own, and a tour that resolves to one step opens on it and
      records itself as shown — so the walkthrough waits, armed, until the user
      opens a booking, and then runs whole.
    */
    steps: [
      {
        anchor: 'booking-summary',
        titleKey: 'mweb.tours.booking.summary.title',
        bodyKey: 'mweb.tours.booking.summary.body',
      },
      {
        anchor: 'booking-ticket',
        titleKey: 'mweb.tours.booking.ticket.title',
        bodyKey: 'mweb.tours.booking.ticket.body',
      },
      {
        anchor: 'booking-backout',
        titleKey: 'mweb.tours.booking.backout.title',
        bodyKey: 'mweb.tours.booking.backout.body',
      },
    ],
  },
];

/** Look up a tour by id. Returns undefined for an id no longer in the registry
 * — a stored completion for a retired tour must not throw. */
export function findTour(id: string): TourDefinition | undefined {
  return TOURS.find((tour) => tour.id === id);
}

/**
 * The tours a viewer may see. A role-gated tour is hidden outright rather than
 * shown-and-disabled: Create Pod walks through a screen a non-host cannot open,
 * so offering it is a dead end.
 */
export function toursForRoles(roles: readonly string[]): TourDefinition[] {
  return TOURS.filter((tour) => !tour.requiredRole || roles.includes(tour.requiredRole));
}
