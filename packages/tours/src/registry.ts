import type { TourDefinition, TourId } from './types';

/** The tour that runs itself once, right after a user's first signup. */
export const HOME_TOUR_ID: TourId = 'home';

/**
 * Every guided tour, in the order the Tour Guide centre lists them. Adding a
 * screen is one entry here plus the matching `data-tour` / registered anchors —
 * no change to either overlay, which is the "extensible for future screens"
 * requirement.
 */
export const TOURS: readonly TourDefinition[] = [
  {
    id: 'home',
    title: 'Home',
    caption: 'Pods, clubs, search and everything on your home screen',
    path: '/',
    nativeRoute: 'Home',
    steps: [
      {
        anchor: 'home-pods',
        title: 'What are Pods?',
        body: 'Pods are the meetups you can join — a game, a class, a jam. Tap one to see the details and book a spot.',
      },
      {
        anchor: 'home-clubs',
        title: 'What are Clubs?',
        body: 'Clubs are the communities that run pods. Follow a club to keep seeing what it puts on.',
      },
      {
        anchor: 'home-search',
        title: 'Search',
        body: 'Look for a pod, a club or a place by name whenever you know what you are after.',
      },
      {
        anchor: 'home-categories',
        title: 'Categories',
        body: 'Browse by interest — sports, music, food and the rest. Picking one narrows everything below.',
      },
      {
        anchor: 'home-filters',
        title: 'Filters',
        body: 'Narrow the list by date, price and distance to find something that actually fits your week.',
      },
      {
        anchor: 'home-notifications',
        title: 'Notifications',
        body: 'Booking confirmations, reminders and club updates land here.',
      },
      {
        anchor: 'home-profile',
        title: 'Your profile',
        body: 'Your bookings, saved pods, account settings and the ways to earn with Duncit all live behind this.',
      },
    ],
  },
  {
    id: 'club',
    title: 'Club Page',
    caption: 'Following a club and finding its pods — open any club to start',
    path: '/clubs',
    nativeRoute: 'Home',
    nativeTab: 'Clubs',
    steps: [
      {
        anchor: 'club-header',
        // The follower count is a clause this step used to promise and only mWeb
        // could keep: on native it sits below the Follow pill, so covering it
        // would have swallowed the next step's target.
        title: 'The club',
        body: 'Who runs it and what it is about, in the club’s own words.',
      },
      {
        anchor: 'club-follow',
        title: 'Follow',
        body: 'Following puts this club’s new pods in front of you as they are published.',
      },
      {
        anchor: 'club-pods',
        title: 'Its pods',
        body: 'Everything this club has coming up. Tap any pod to book.',
      },
    ],
  },
  {
    id: 'pod-details',
    title: 'Pod Details',
    caption: 'Reading a pod and booking a spot — open any pod to start',
    path: '/',
    nativeRoute: 'Home',
    steps: [
      {
        anchor: 'pod-summary',
        title: 'The essentials',
        body: 'When it runs, where it is and what a spot costs.',
      },
      {
        anchor: 'pod-spots',
        title: 'Spots left',
        body: 'How many places are still open. Popular pods fill up, so this moves.',
      },
      {
        anchor: 'pod-book',
        title: 'Book your spot',
        body: 'Reserve a place here. You will get a ticket by email with a link straight back to this pod.',
      },
    ],
  },
  {
    id: 'create-pod',
    title: 'Create Pod',
    caption: 'Hosting your own pod, step by step',
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
        title: 'Four steps',
        body: 'The basics, then where it happens, then a venue slot — the slot you pick sets your pod’s date and time. What you type is saved as a draft as you go.',
      },
      {
        anchor: 'create-pod-basics',
        title: 'Name it well',
        body: 'This is the line people read first. A description and a cover photo follow it, and both are checked before your pod goes live.',
      },
      {
        anchor: 'create-pod-publish',
        title: 'Pricing, then publish',
        body: 'This carries you through to the last step, where you set a ticket price and see what you take home after fees. Nothing is published until you press Create Pod.',
      },
    ],
  },
  {
    id: 'profile',
    title: 'Profile',
    caption: 'Your account, bookings and ways to earn',
    // The menu, not the account screen. Pod history and Earn have never lived on
    // /account — they are menu tiles — so two of these three steps had nothing
    // to point at and the tour did nothing but navigate. The menu is a real
    // route on both surfaces (it used to be a drawer), so it opens cold.
    path: '/menu',
    nativeRoute: 'Menu',
    steps: [
      {
        anchor: 'profile-details',
        title: 'Your profile',
        body: 'Your name and photo. Tap through for the profile other people see, and to keep your details current.',
      },
      {
        anchor: 'profile-history',
        title: 'Pod history',
        body: 'Everything you have booked, past and upcoming, with your tickets.',
      },
      {
        anchor: 'profile-earn',
        title: 'Earn with Duncit',
        body: 'Host a pod, register a venue, list a product or run a club.',
      },
    ],
  },
  {
    id: 'booking',
    title: 'Booking Flow',
    caption: 'From holding a spot to holding a ticket — open any booking to start',
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
        title: 'Your booking',
        body: 'The pod you booked, when it runs and what the spot cost you.',
      },
      {
        anchor: 'booking-ticket',
        title: 'Your ticket',
        body: 'Download your ticket here. The QR code inside it is what gets scanned at the door.',
      },
      {
        anchor: 'booking-backout',
        title: 'Changed your mind?',
        body: 'You can back out of a pod you have joined. If you paid for it, your refund is released once someone takes the spot.',
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
