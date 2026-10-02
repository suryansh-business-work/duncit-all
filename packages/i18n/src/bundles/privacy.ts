import type { NestedCatalogue } from '../catalogue';

/**
 * Tracking consent, the Privacy & data screen, and the other GDPR prompts.
 *
 * Its own namespace because three kinds of surface render the same sentences:
 * mWeb and the native app (rule 27 — identical), and the Astro websites'
 * consent banner. A visitor who reads "Analytics" on the website and
 * "Usage measurement" in the app has been asked two different questions.
 */
export const PRIVACY_BUNDLE: NestedCatalogue = {
  privacy: {
    // The first-visit banner. Accept and Reject are equally prominent: GDPR
    // consent is only valid when refusing is as easy as agreeing.
    banner: {
      label: 'Privacy choices',
      title: 'Your privacy',
      body: 'We use essential storage to keep you signed in. With your permission we also measure how Duncit is used and which campaigns bring people here. You can change this any time in Privacy & data.',
      acceptAll: 'Accept all',
      rejectAll: 'Reject all',
      customise: 'Choose',
      save: 'Save choices',
      policyLink: 'Privacy policy',
    },
    categories: {
      essential: {
        title: 'Essential',
        body: 'Sign-in, your cart, your language and this choice. Duncit cannot work without them.',
        alwaysOn: 'Always on',
      },
      analytics: {
        title: 'Analytics',
        body: 'The pages you open and the buttons you tap, so we can see what works and fix what does not. Kept for 13 months.',
      },
      marketing: {
        title: 'Marketing attribution',
        body: 'Which link or campaign brought you to Duncit, so we know which ones are worth running.',
      },
    },
    // Profile > Privacy & data.
    page: {
      title: 'Privacy & data',
      entryHint: 'Tracking choices and a copy of your data',
      trackingTitle: 'Tracking choices',
      trackingBlurb: 'Optional. Both stay off unless you turn them on.',
      saved: 'Privacy choices saved',
      saveFailed: 'Could not save your choices. Please try again.',
      dataTitle: 'Your data',
      dataBlurb: 'Download a copy of everything Duncit holds about you, as a JSON file.',
      download: 'Download my data',
      downloading: 'Preparing your file…',
      downloaded: 'Your data file is ready',
      downloadFailed: 'Could not prepare your file. Please try again.',
      deleteHint: 'To delete your account and its data, use Delete account under Security.',
    },
    // The signup form. Unticked by default: marketing is opt-in.
    signup: {
      marketingOptIn: 'Send me offers, new pods and news from Duncit by email and WhatsApp. I can stop this any time.',
    },
    // Shown before the first contacts sync on either app.
    contacts: {
      title: 'Before you sync your contacts',
      body: 'Duncit reads the names and phone numbers in your phone book to find friends who are already here. Numbers that match nobody are kept only so you can invite them, and are deleted after 90 days without a sync. You can remove everything any time with Remove synced contacts.',
      agree: 'Sync contacts',
      cancel: 'Not now',
    },
  },
};
