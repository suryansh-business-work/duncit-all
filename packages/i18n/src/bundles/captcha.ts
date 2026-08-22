import type { NestedCatalogue } from '../catalogue';

/**
 * The human check, in the reader's language.
 *
 * ONE namespace for every surface that renders it (rule 34/40): the websites'
 * contact, grievance, FAQ and newsletter forms, and the status page's problem
 * report. The widget is the same widget everywhere, so the words in it are the
 * same words everywhere — a visitor who fails the check on one form and passes
 * it on another should not be reading two different explanations of why.
 *
 * The Astro sites have no translator of their own; they render the resolved
 * fallback from `captchaCopy` and get exactly this text.
 */
export const CAPTCHA_BUNDLE: NestedCatalogue = {
  captcha: {
    title: 'Quick human check',
    label: 'Type the code',
    hint: 'Type the characters shown in the picture.',
    imageAlt: 'Verification code picture',
    refresh: 'Show a different code',
    loading: 'Loading the check…',
    unavailable: 'The check could not load. Please try again in a moment.',
    required: 'Please type the code shown above.',
    wrong: 'That code does not match. Here is a new one to try.',
    expired: 'That code has expired. Here is a new one to try.',
  },
};
