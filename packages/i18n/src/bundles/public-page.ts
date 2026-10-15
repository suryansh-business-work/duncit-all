import type { NestedCatalogue } from '../catalogue';

/**
 * Public pages — the venue / host page anyone can open without signing in,
 * its tracked link, QR and A4 poster, the owner's tracking numbers, and the
 * pod a visitor picked on that page, shown on top of every sign-in screen.
 *
 * A namespace of its own because the same sentences render in mWeb, in the
 * Partners console and in the native app (rules 27 + 38 + 40).
 */
export const PUBLIC_PAGE_BUNDLE: NestedCatalogue = {
  publicPage: {
    card: {
      venueTitle: 'Publish your venue',
      venueSubtitle:
        'Get a Duncit link and QR for your venue page. Anyone can open it without signing in and see your photos, pods and reels.',
      hostTitle: 'Publish your host page',
      hostSubtitle:
        'Get a Duncit link and QR for your host page. Anyone can open it without signing in and see your pods and reels.',
      publish: 'Publish',
      publishing: 'Publishing…',
      published: 'Published',
      notApproved: 'Your venue can be published once it is approved and active.',
      notHost: 'Your host page can be published once you are an approved host.',
      loadFailed: "We couldn't load your page. Please try again.",
      publishFailed: "We couldn't publish your page. Please try again.",
      retry: 'Retry',
    },
    link: {
      label: 'Your page link',
      copy: 'Copy link',
      copied: 'Link copied',
      copyFailed: "We couldn't copy the link. Please copy it by hand.",
      open: 'Open page',
      share: 'Share',
      shareMessage: 'Check out {name} on Duncit: {url}',
      qrAlt: 'QR code for {name}',
      downloadQr: 'Download QR',
      downloadPoster: 'Download A4 poster',
      preparingPoster: 'Preparing poster…',
      posterFailed: "We couldn't make the poster. Please try again.",
      downloadTableLabel: 'Download table label',
      preparingTableLabel: 'Preparing table label…',
      tableLabelFailed: "We couldn't make the table label. Please try again.",
      qrFailed: "We couldn't save the QR code. Please try again.",
    },
    poster: {
      venueHeadline: 'Scan to see the pods happening here',
      venueFoodHeadline: 'Scan to see the Menu & pods happening here',
      hostHeadline: 'Scan to join my next pod',
      footer: 'Find your people on Duncit',
    },
    stats: {
      title: 'Page tracking',
      range: 'Period',
      clicks: 'Link opens',
      visitors: 'Unique visitors',
      signedUp: 'Signed up',
      viewedPod: 'Opened a pod',
      paid: 'Booked',
      conversion: 'Booking rate',
      topSources: 'Top sources',
      topCities: 'Top cities',
      empty: 'No visits yet. Share your link or put the poster up to get started.',
    },
    range: {
      week: 'Last 7 days',
      month: 'Last 30 days',
      quarter: 'Last 90 days',
      all: 'All time',
    },
    authPod: {
      eyebrow: 'You picked this pod',
      hint: 'Log in or sign up to see the details and book your spot.',
      imageAlt: 'Photo of {name}',
    },
    hostPage: {
      eyebrow: 'Host on Duncit',
      notFound: 'This host page is not available.',
      loadFailed: "We couldn't load this page. Please try again.",
      retry: 'Retry',
      podsTitle: 'Pods by {name}',
      noPods: 'No pods yet. Check back soon.',
      copyLink: 'Copy link',
      linkCopied: 'Link copied',
      avatarAlt: 'Photo of {name}',
    },
    reels: {
      title: 'Reels',
      open: 'Open {name}',
    },
    // "Request an event" — the empty state of a host's pods or a venue's
    // Events when nothing is coming up (mWeb + native), and the partner's and
    // the Venues / Hosts consoles' list of those requests.
    eventRequest: {
      title: 'Nothing coming up yet',
      venueHint: 'Would you go to an event at {name}? Ask for one and we will let you know when it is live.',
      hostHint: 'Would you join a pod by {name}? Ask for one and we will let you know when it is live.',
      cta: 'Request an event',
      signInCta: 'Sign in to request an event',
      requestedTitle: 'You have already requested an event',
      requestedHint: 'We will let you know as soon as there is one to join.',
      loadFailed: "We couldn't check your request. Please try again.",
      retry: 'Retry',
      dialogTitle: 'Request an event',
      dialogVenueBody: 'Tell {name} you would come to an event here.',
      dialogHostBody: 'Tell {name} you would join a pod they host.',
      noteLabel: 'Anything they should know? (optional)',
      notePlaceholder: 'A day, a time or the kind of event you would like',
      noteTooLong: 'Keep the note under {max} characters.',
      cancel: 'Cancel',
      send: 'Send request',
      sending: 'Sending…',
      sent: 'Request sent. We will let you know when there is an event.',
      failed: "We couldn't send your request. Please try again.",
    },
    eventRequests: {
      title: 'Event Requests',
      ownerVenueSubtitle:
        'Members who asked for an event at your venues. Publishing a pod there answers every open request and tells them.',
      ownerHostSubtitle:
        'Members who asked you to host an event. Publishing a pod answers every open request and tells them.',
      consoleVenueSubtitle:
        'Every event request members sent to a venue with nothing coming up. A request closes itself when the venue publishes a pod.',
      consoleHostSubtitle:
        'Every event request members sent to a host with nothing coming up. A request closes itself when the host publishes a pod.',
      colVenue: 'Venue',
      colHost: 'Host',
      colRequester: 'Requested by',
      colNote: 'Note',
      colStatus: 'Status',
      colRequested: 'Requested',
      colClosed: 'Closed',
      colActions: 'Actions',
      statusOpen: 'Open',
      statusFulfilled: 'Fulfilled',
      statusDismissed: 'Dismissed',
      total: 'Total',
      markFulfilled: 'Mark fulfilled',
      dismiss: 'Dismiss',
      updated: 'Request updated.',
      updateFailed: 'Could not update the request. Please try again.',
      countsFailed: "We couldn't load the totals. Please try again.",
      empty: 'No event requests yet.',
      search: 'Search by name or note',
    },
  },
};
