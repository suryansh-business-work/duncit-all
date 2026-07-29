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
    caption: 'Following a club and finding its pods',
    path: '/clubs',
    nativeRoute: 'Home',
    steps: [
      {
        anchor: 'club-header',
        title: 'The club',
        body: 'Who runs it, what it is about and how many people follow it.',
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
    caption: 'Reading a pod and booking a spot',
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
    steps: [
      {
        anchor: 'create-pod-basics',
        title: 'The basics',
        body: 'Name your pod, describe it and add a photo people will recognise.',
      },
      {
        anchor: 'create-pod-when-where',
        title: 'When and where',
        body: 'Pick a date and a venue slot. The slot you choose sets the pod’s time.',
      },
      {
        anchor: 'create-pod-pricing',
        title: 'Pricing',
        body: 'Set a ticket price and see what you take home after fees before you publish.',
      },
    ],
  },
  {
    id: 'profile',
    title: 'Profile',
    caption: 'Your account, bookings and ways to earn',
    path: '/account',
    nativeRoute: 'Account',
    steps: [
      {
        anchor: 'profile-details',
        title: 'Your details',
        body: 'Name, photo and contact details — keep these current so hosts can reach you.',
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
    caption: 'From picking a spot to holding a ticket',
    path: '/pod-history',
    nativeRoute: 'PodHistory',
    steps: [
      {
        anchor: 'booking-list',
        title: 'Your bookings',
        body: 'Every spot you hold, newest first.',
      },
      {
        anchor: 'booking-ticket',
        title: 'Your ticket',
        body: 'Open a booking for its QR ticket — that is what gets scanned at the door.',
      },
      {
        anchor: 'booking-backout',
        title: 'Changed your mind?',
        body: 'You can back out of a paid pod. Your refund is released once someone takes the spot.',
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
