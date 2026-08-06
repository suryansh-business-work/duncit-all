import { flattenCatalogue, type NestedCatalogue } from './catalogue';

/**
 * The SHIPPED FALLBACK CATALOGUE — every user-facing key the client surfaces
 * know about, in the same nested shape as the server's Localization entries
 * (CLAUDE.md rule 38).
 *
 * It lives here rather than in each surface for two reasons:
 *  - mWeb and native must be identical (rule 27), and two hand-kept copies of
 *    the same `mweb.*` copy is exactly how they drift apart;
 *  - the admin panel seeds Localization > Translations from this registry, so
 *    a key added here is offered for translation without anyone re-typing it.
 *
 * Each surface still SHIPS its bundle — it re-exports the slice it renders, so
 * the copy is compiled into that build and available offline.
 */

/** Copy shared by mWeb and the native app — one namespace, one source. */
export const MWEB_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageHint: 'Choose the language for the app.',
      languageSaved: 'Language updated',
    },
    account: {
      preferences: 'Preferences',
    },
    home: {
      closeMenu: 'Close menu',
      seeAll: 'See all',
      morePods: '+{count} more',
      searchPods: 'Search pods…',
      noSearchResults: 'No pods match your search.',
      happeningNearbyTitle: 'Happening nearby',
      happeningNearbySubtitle: 'Curated events around you',
      happeningNearbyEmpty: 'No live pods around you right now.',
      previousPodsTitle: 'Previous Pods',
      previousPodsSubtitle: 'Pods that have already taken place',
      previousPodsEmpty: 'No previous pods to show yet.',
      // Home redesign (mock): greeting subtitle, labelled header actions,
      // super-category promo tiles, vibe heading fallbacks, host CTA, club rec.
      // Plurals ship as explicit One/Many pairs: the key-verification gate needs
      // every leaf rendered via a literal t('…'), which `.one/.other` siblings
      // resolved from a base key would fail.
      greetingSubtitle: 'Discover. Connect. Create memories.',
      actionSearch: 'Search',
      actionCart: 'Cart',
      actionAlerts: 'Alerts',
      forYouSubtitle: 'Personalized for you',
      forPetSubtitle: 'Fun for your furry friend',
      vibeHeading: "What's your vibe today?",
      vibeSubheading: 'Explore experiences that match your mood.',
      vibeFilter: 'Filter',
      vibeAll: 'All',
      vibeAllOf: 'All {name}',
      spotsLeftOne: '1 spot left',
      spotsLeftMany: '{count} spots left',
      joiningNow: '{count} joining now',
      podsNearbyOne: '1 pod nearby',
      podsNearbyMany: '{count} pods nearby',
      hostCtaTitle: 'Host your own pod',
      hostCtaSubtitle: 'Create an event and bring your people together.',
      hostCtaButton: 'Create Pod',
      becomeHostCtaTitle: 'Become a host',
      becomeHostCtaSubtitle: 'Create your own pod and bring people together.',
      becomeHostCtaButton: 'Get started',
      joinClub: 'Join Club',
      joinedClub: 'Joined',
      membersOne: '1 Member',
      membersMany: '{count} Members',
      homeEmpty: 'No pods here yet. Pull to refresh or pick a different vibe.',
      savePod: 'Save pod',
      savedPod: 'Remove from saved',
    },
    nav: {
      home: 'Home',
      explore: 'Explore',
      clubs: 'Clubs',
      chats: 'Chats',
      following: 'Following',
    },
    shop: {
      title: 'Pod Shop',
      emptyState: 'No products match your filters.',
      featured: 'Featured Products',
      outOfStock: 'Out of stock',
      includeOutOfStock: 'Include out of stock',
      searchPlaceholder: 'Search products or brands…',
    },
    podDetails: {
      spotFilled: 'Spot filled',
      spotFilledBy: 'Spot filled by {name}',
      formerAttendee: 'Former attendee',
      newAttendee: 'A new attendee',
      // One booking can cover several people. The list still shows one face per
      // person — the group size is a label beside their name, never extra
      // avatars, or the same booking gets counted twice on screen.
      otherMembersOne: '+1 other member',
      otherMembersMany: '+{count} other members',
      seatsTaken: '{taken} of {total} seats taken',
      seatsLeftOne: '1 seat left',
      seatsLeftMany: '{count} seats left',
    },
    // Rating a pod after it happens. Each part is asked separately because a
    // guest can love the evening and still have been let down by the room —
    // the aspect labels are keyed from @duncit/utils' POD_FEEDBACK_ASPECT_KEY,
    // so the two apps ask word-for-word the same questions.
    podFeedback: {
      title: 'How was “{title}”?',
      subtitle: 'Rate whichever parts you have an opinion on. Only the first is needed.',
      aspectOverall: 'Overall pod experience',
      aspectHost: 'Host',
      aspectVenue: 'Venue',
      aspectClubAdmin: 'Club admin',
      aspectSafety: 'Safety',
      aspectFood: 'Food',
      aspectOther: 'Anything else',
      comments: 'Comments',
      commentsPlaceholder: 'Tell us more (optional)',
      skip: 'Not now',
      submit: 'Submit',
      submitting: 'Sending…',
      rateAspect: 'Rate {aspect} {stars} out of 5',
      failed: 'That could not be sent. Please try again.',
    },
    // What to say when a payment does not complete. Three outcomes, three
    // answers — a buyer whose money may have left their account must not be
    // told their payment was "cancelled".
    payment: {
      cancelledTitle: 'Payment cancelled',
      cancelledBody: 'You closed the payment before it went through. Nothing has been charged.',
      failedTitle: 'Payment did not go through',
      failedBody: 'Your bank did not approve this payment, so nothing has been charged.',
      timeoutTitle: 'We did not hear back in time',
      timeoutBody:
        'The payment gateway stopped responding, so we cannot confirm whether this went through.',
      // The reassurance, and the reference to hold us to it.
      moneySafe:
        'Your money is safe. If it was deducted it will be refunded within 7–10 business days.',
      ticketRaised: 'Your support ticket is {ticket}',
      ticketPending: 'Opening a support ticket…',
      ticketFailed:
        'We could not open a support ticket automatically — please contact support with this payment.',
      gatewaySaid: 'The gateway said: {reason}',
      retry: 'Retry payment',
      close: 'Close',
    },
    // Plurals ship as explicit One/Many pairs: the key-verification gate needs
    // every leaf rendered via a literal t('…'), which the translator's
    // `.one/.other` siblings would fail.
    checkout: {
      seatsOne: '1 seat',
      seatsMany: '{count} seats',
    },
    // The Follow button's three states. REQUESTED only ever appears on a
    // private profile, whose owner must accept before a follow exists.
    follow: {
      follow: 'Follow',
      requested: 'Requested',
      following: 'Following',
      accept: 'Accept',
      reject: 'Reject',
      accepted: 'Accepted',
      rejected: 'Rejected',
    },
    // The door scanner: one ticket can admit a group, so the host is told how
    // many people that single QR lets in. The count itself is rendered as a
    // badge beside this copy, which is why neither string carries it.
    hostScan: {
      personOnTicket: 'person on this ticket',
      peopleOnTicket: 'people on this ticket',
      // Collecting the rest of the group. A multi-seat ticket is a number until
      // someone writes down who it covers, and the scan is the one moment they
      // are all standing there — so the ticket does not check in until they are.
      companionsTitle: 'Who else is coming in?',
      companionsBody: 'This ticket admits {seats}. Add the other {count} to mark attendance.',
      companionName: 'Full name',
      companionPhone: 'Phone number',
      companionsSubmit: 'Mark attendance',
      companionsIncomplete: 'Fill in every name and phone number.',
      companionsHeading: 'Person {index}',
    },
    // The slot picker's copy. @duncit/slots renders the same two steps on
    // every surface, so `shell.slots` below must stay word-for-word identical —
    // they are written out rather than shared through a const because the
    // key-verification gate parses this file statically and cannot follow a
    // spread. The server stores one row per key path, so the two namespaces
    // cannot collapse into one.
    slots: {
      date: 'Date',
      hint: "From the venue's availability calendar — the slot sets the pod's date & time.",
      availableSlots: 'Available slots',
      free: 'Free',
      today: 'Today',
      tomorrow: 'Tomorrow',
      loading: 'Loading available slots…',
      empty: 'No open slots right now. Try another venue or check back later.',
      emptyDay: 'No slots on this day. Pick another date.',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      pickVenueFirst: 'Select a venue first to see its available slots.',
      currentlyBooked: 'Currently booked for this pod',
      wholeVenue: 'Whole venue',
      // Onboarding meetings render the same calendar, but a booked slot stays
      // visible-and-disabled instead of disappearing, so they get their own hint.
      meetingHint: 'Greyed-out slots are already booked.',
      meetingRescheduleHint:
        'Greyed-out slots are booked; your current slot is marked and can’t be re-selected.',
      current: 'current',
    },
    // Duncit Coins — the loyalty balance shown in User mode only. Placeholders
    // are deliberately NOT named `count`: the translator overwrites that var
    // with its own plural counter, so `{coins}` is what actually renders.
    coin: {
      title: 'Duncit Coin',
      sidebarCaption: 'Earn {pct}% back on every payment',
      balanceLabel: 'Coin balance',
      lifetimeLabel: 'Lifetime earned',
      rateNote:
        'You earn {pct}% back as Duncit Coins on every successful payment. 1 coin = {symbol}1.',
      historyTitle: 'Transaction history',
      historyEmpty: 'No coin activity yet. Rewards from your payments will show up here.',
      earned: 'Earned',
      redeemed: 'Redeemed',
      loadError: 'Could not load your Duncit Coins. Please try again.',
      checkoutTitle: 'Duncit Coins',
      checkoutAvailable: '{coins} coins available',
      checkoutApply: 'Use coins',
      checkoutRemove: 'Remove',
      checkoutApplied: '{coins} coins applied',
      checkoutNone: 'You have no Duncit Coins to redeem yet.',
    },
  },
};

/** Chrome rendered by the portal shell, shared by every MUI portal. */
export const SHELL_BUNDLE: NestedCatalogue = {
  mweb: {
    common: {
      language: 'Language',
      languageSaved: 'Language updated',
    },
  },
  shell: {
    profile: {
      accessRoles: 'ACCESS ROLES',
      noRoles: 'No roles assigned.',
      // NOT mweb.common.languageHint: the portal wording differs from the app's,
      // and the server stores ONE row per key — a second value for the same key
      // is unrepresentable, so whichever bundle merged last would silently
      // overwrite the other surface's copy.
      languageHint: 'Choose the language for this portal.',
    },
    /** Word-for-word identical to `mweb.slots` — see the note there. */
    slots: {
      date: 'Date',
      hint: "From the venue's availability calendar — the slot sets the pod's date & time.",
      availableSlots: 'Available slots',
      free: 'Free',
      today: 'Today',
      tomorrow: 'Tomorrow',
      loading: 'Loading available slots…',
      empty: 'No open slots right now. Try another venue or check back later.',
      emptyDay: 'No slots on this day. Pick another date.',
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      pickVenueFirst: 'Select a venue first to see its available slots.',
      currentlyBooked: 'Currently booked for this pod',
      wholeVenue: 'Whole venue',
      meetingHint: 'Greyed-out slots are already booked.',
      meetingRescheduleHint:
        'Greyed-out slots are booked; your current slot is marked and can’t be re-selected.',
      current: 'current',
    },
  },
};

/**
 * The marketing websites' own chrome. Navigation and footer LINK labels are
 * not here — those are content from the Website portal's Navigation manager,
 * and duplicating them as translation keys would give the same text two
 * owners.
 */
export const WEBSITE_BUNDLE: NestedCatalogue = {
  website: {
    footer: {
      newsletterTitle: 'Get Duncit updates',
      emailPlaceholder: 'Email address',
      notify: 'Notify',
      sending: 'Sending',
      subscribed: 'Subscribed!',
      tryAgain: 'Try again',
      policyHub: 'Policy Hub',
      allPolicies: 'All policies',
      rights: 'All Rights Reserved',
    },
    nav: {
      closeMenu: 'Close menu',
      theme: 'Switch between light and dark',
    },
  },
};

/** Every client bundle, by the surface that ships it. */
export const SURFACE_BUNDLES: Record<string, NestedCatalogue> = {
  mweb: MWEB_BUNDLE,
  shell: SHELL_BUNDLE,
  website: WEBSITE_BUNDLE,
};

/**
 * Every shipped key as flat `key -> default text`, deduplicated across
 * surfaces. The admin panel imports this to seed missing Translations rows.
 */
export function allFallbackEntries(): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const bundle of Object.values(SURFACE_BUNDLES)) {
    Object.assign(merged, flattenCatalogue(bundle));
  }
  return merged;
}
