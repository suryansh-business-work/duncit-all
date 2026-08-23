import type { NestedCatalogue } from '../catalogue';

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
      menu: 'Menu',
    },

    /**
     * The shared Astro chrome in @duncit/brand, rendered by all four sites.
     *
     * Account names in the social row are NOT here: Instagram and LinkedIn are
     * proper nouns, and a translator has nothing to do with them.
     */
    brand: {
      /**
       * The illustrated phone on the marketing heroes.
       *
       * It draws the app's own layout rather than a screenshot, so the sample
       * pod and the sample chat are copy a visitor reads — in a Hindi build
       * they should be Hindi, like everything around them.
       */
      appPhone: {
        alt: 'The Duncit app',
        tonight: 'Tonight',
        nearYou: '3 pods near you',
        podTitle: 'Sunset football, 6pm',
        podMeta: 'Turf 9 · 4 spots left',
        join: 'Join',
        chatOne: 'Weekend crew',
        chatOneMessage: 'See you at 6! 🔥',
        chatTwo: 'Board game night',
        chatTwoMessage: 'Anyone bringing snacks?',
      },
      newsletter: {
        placeholder: 'you@example.com',
        button: 'Subscribe',
        consentLink: 'privacy policy',
        busy: 'Subscribing…',
        ok: 'You are on the list.',
        error: 'That did not go through — check your connection and try again.',
      },
      policyStrip: {
        heading: 'Policies',
      },
    },
  },
};
