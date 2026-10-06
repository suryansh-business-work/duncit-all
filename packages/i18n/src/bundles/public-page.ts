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
      qrFailed: "We couldn't save the QR code. Please try again.",
    },
    poster: {
      venueHeadline: 'Scan to see the pods happening here',
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
  },
};
