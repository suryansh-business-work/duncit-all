import type { NestedCatalogue } from '../catalogue';

/**
 * Pod Requests between venues and hosts, both ways: the nearby searches, the
 * request lists and tabs in Host Studio and Venue Studio, one request's
 * detail (accept → slot → confirm → Create Pod), and the admin-only monthly
 * limit fields.
 *
 * Rendered by the Partners console, mWeb AND native, so it is one namespace
 * every surface ships rather than a copy per bundle (rule 40).
 */
export const POD_REQUESTS_BUNDLE: NestedCatalogue = {
  podRequests: {
    // Studio sections and tabs.
    fromVenuesTitle: 'Pod Requests from Venues',
    fromHostsTitle: 'Pod Requests from Hosts',
    sentToVenuesTitle: 'Your requests to venues',
    sentToHostsTitle: 'Your requests to hosts',
    tabRequests: 'Requests',
    tabVenueAccepted: 'Venue Accepted Requests',
    tabHostAccepted: 'Host Accepted Requests',
    emptyIncoming: 'No new Pod Requests yet.',
    emptyAccepted: 'Requests you accept appear here.',
    emptySent: 'Requests you send appear here.',
    // Nearby search.
    searchHostsTitle: 'Search Nearby Hosts',
    searchVenuesTitle: 'Search Nearby Venues',
    searchingHosts: 'Searching Nearby Hosts...',
    searchingVenues: 'Searching Nearby Venues...',
    searchingHint: 'Looking within {km} km of {place}',
    radiusLabel: 'Radius',
    radiusValue: '{km} km',
    categoryLabel: 'Category',
    allCategories: 'All categories',
    venueLabel: 'Venue',
    noHostsFound: 'No hosts found within {km} km.',
    noVenuesFound: 'No venues found within {km} km.',
    expandSearch: 'Search within {km} km',
    tryAllCategories: 'Try all categories',
    distanceAway: '{km} km away',
    requestPod: 'Request Pod',
    requestSent: 'Pod Request sent.',
    noteLabel: 'Note (optional)',
    noteHint: 'Tell them what kind of pod you have in mind.',
    noteTooLong: 'Keep the note under {max} characters.',
    noteTitle: 'Note',
    quotaLeft: '{remaining} of {limit} requests left this month',
    quotaReached: 'You have used all {limit} Pod Requests for this month.',
    pickLocation: 'Pick your city in the location picker to search nearby.',
    noApprovedVenue: 'Pod Requests open once one of your venues is approved.',
    // Statuses.
    statusRequested: 'Requested',
    statusAccepted: 'Accepted',
    statusSlotRequested: 'Slot requested',
    statusSlotConfirmed: 'Slot confirmed',
    statusPodCreated: 'Pod created',
    statusRejected: 'Declined',
    statusCancelled: 'Withdrawn',
    statusExpired: 'Expired',
    // One request.
    detailTitle: 'Pod Request',
    hostDetails: 'Host',
    venueDetails: 'Venue',
    slotDetails: 'Proposed booking',
    capacity: 'Capacity {count}',
    accept: 'Accept',
    decline: 'Decline',
    withdraw: 'Withdraw',
    pickSlot: 'Propose a time and price',
    pickSlotHint: 'Pick a time when the venue is open, the guests and how the venue is paid. The other side confirms it before the pod is created.',
    sendSlot: 'Send proposal',
    confirmSlot: 'Confirm proposal',
    declineSlot: 'Decline proposal',
    waitingAnswer: 'Waiting for the other side to answer.',
    waitingSlot: 'Waiting for the other side to propose a time and price.',
    waitingConfirm: 'Waiting for the other side to confirm the proposal.',
    createPod: 'Create Pod',
    createPodHint: 'The slot is confirmed. Create the pod: the venue and slot are already chosen.',
    hostCreatesPod: 'The slot is confirmed. The host creates the pod next.',
    viewPod: 'View pod',
    contactTitle: 'Contact',
    contactHidden: 'Contact details are shared once the pod is created.',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    // The monthly limit — set by admins only (Venues / Hosts portals, Onboarding).
    venueLimitLabel: 'Maximum Host Requests / Month',
    hostLimitLabel: 'Maximum Venue Requests / Month',
    overrideHint: 'Leave empty to use the default of 10 per month.',
    overrideInvalid: 'Enter a whole number from 0 to 1000, or leave it empty.',
    // Partners console.
    navTitle: 'Pod Requests',
    backToList: 'Back to Pod Requests',
    requestedOn: 'Requested on {date}',
    notFound: 'This Pod Request could not be found.',
    venueUnplaced: 'This venue has no city yet. Add one in Venue Management to search nearby.',
    noHost: 'Your host profile is not available yet.',
  },
  // A time window and price terms put forward on the app — a Pod Request's
  // proposal, a venue accepting an Auto Pod, a venue taking over a pod.
  windowOffer: {
    guests: 'Guests',
    guestsHint: 'How many people the venue should expect.',
    guestsInvalid: 'Enter at least 1 guest',
    cancel: 'Cancel',
    proposeTitle: 'Propose a time and a price',
    proposeHint: 'Pick a time the venue is open and how it is paid. The other side confirms it before the pod is created.',
    propose: 'Send proposal',
    proposedTerms: 'Proposed price',
    bookingTotal: 'Booking total {amount}',
    venueReceives: 'Venue receives {amount}',
    autoPodTitle: 'Accept with a time and a price',
    autoPodHint: "Pick when your venue hosts this pod and what you charge. Duncit's commission is added on top.",
    changeTitle: 'Take over this pod',
    changeHint: "Pick when your venue hosts the pod and what you charge. The pod's guests stay the same.",
    approve: 'Approve',
  },
};
