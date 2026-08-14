import type { NestedCatalogue } from '../catalogue';

/**
 * The policy gate at signup, and the log Legal reads it back from.
 *
 * One namespace file rather than two because they describe the same event from
 * both ends — the sentence a person ticks and the row an auditor later reads —
 * and a gate that says "policies" while the log column says "documents" is the
 * drift rules 27 and 40 exist to stop.
 *
 * `policyAcceptance.*` is rendered by mWeb AND the native app, which must be
 * identical (rule 27). `legalAcceptanceLogs.*` is the Legal portal's own page,
 * layered over the shell's namespace by `mountPortal`.
 *
 * What is deliberately NOT keyed here: the policy TITLE and its HTML content.
 * Those are Localization-independent API data written by Legal in the portal —
 * a translator can no more own "Refund Policy" than they can own a person's
 * name. The acceptance METHOD is the opposite: the server sends `SIGNUP_FORM`,
 * never English, and `policyAcceptanceMethodLabel` turns it into a sentence, so
 * a fourth way to accept is a bundle edit rather than a client release.
 */
export const POLICY_ACCEPTANCE_BUNDLE: NestedCatalogue = {
  // The signup gate — one checkbox on the form, and the dialog it opens.
  policyAcceptance: {
    // The checkbox beside the form field. It is unchecked by default and
    // required, so it reads as a statement the person makes, not an offer.
    checkboxLabel: 'I have read and accept the Duncit policies',
    // The Zod message when the form is submitted without it.
    required: 'Accept every policy before creating your account',
    dialogTitle: 'Policies you need to accept',
    dialogIntro:
      'These apply to your account from the moment it exists. Read each one and accept it — you can open any of them again later from your profile.',
    // The same dialog after Google has returned. The account does NOT exist
    // yet, and saying so is the whole point: nothing has been created in the
    // reader's name while they are still deciding.
    googleIntro:
      'Google has confirmed who you are, but your account is not created yet. Accept each policy below and we will finish signing you up.',
    readAction: 'Read',
    acceptAll: 'Accept all',
    // Shown while the submit button is disabled, so the button explains itself
    // rather than looking broken.
    mustAcceptHint: 'Accept every policy to continue.',
    close: 'Close',
    acceptedCount: '{done} of {total} accepted',
    loading: 'Loading policies…',
    loadFailed: 'Could not load the policies. Please try again.',
  },

  // The Legal portal's audit page. Read-only by design: an acceptance is a
  // record of something a person did, so nothing here edits or deletes one.
  legalAcceptanceLogs: {
    title: 'Policy Acceptance Logs',
    subtitle:
      'Who accepted which policy, and when. Each row keeps the title and number the policy carried at that moment, so a policy edited or deleted since still reads back correctly.',
    search: 'Search by name, email, policy or policy number',
    empty: 'Nobody has accepted a policy yet.',
    colWhen: 'When',
    colUser: 'Person',
    colEmail: 'Email',
    colPolicy: 'Policy',
    colPolicyNo: 'Policy no.',
    colMethod: 'Accepted via',
    colSurface: 'Surface',
    // Keyed by what the server sends, through `policyAcceptanceMethodLabel`.
    methods: {
      signupForm: 'Signup form',
      googleSignup: 'Google signup',
      later: 'Accepted later',
    },
  },
};
