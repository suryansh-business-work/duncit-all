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

    // Everything behind ONE row, opened by clicking it. A row on its own is a
    // sha256 and a user id; this is the screen that turns those into an answer.
    detail: {
      title: 'Acceptance record',
      subtitle: 'Everything on file about this one acceptance.',
      loadFailed: 'Could not load this acceptance record.',
      openHint:
        'Open any row for its full record — the exact wording that was accepted, the person as their account reads today, and everything else they have agreed to.',

      sectionAcceptance: 'This acceptance',
      sectionAccount: 'The person',
      sectionPolicy: 'The policy',
      sectionVersions: 'Wording history',
      sectionPolicyHistory: 'Their trail through this policy',
      sectionUserHistory: 'Everything else they have accepted',

      acceptanceId: 'Record ID',
      acceptedAt: 'Accepted at',
      method: 'Accepted via',
      surface: 'Surface',
      policyUpdatedAt: 'Policy last edited',
      contentHash: 'Wording fingerprint',
      contentHashHint:
        'The sha256 of the exact words they agreed to. It is what ties this record to a wording, and what makes a later edit visible as one.',

      accountId: 'Account ID',
      accountName: 'Name',
      accountEmail: 'Email',
      accountPhone: 'Phone',
      accountStatus: 'Account status',
      accountCreated: 'Account created',
      accountDeleted:
        'This account has been deleted. Its acceptance records stay — that is the point of keeping them.',
      accountMissing:
        'This account has been erased. What they accepted, and when, is still on the record below.',

      policyNo: 'Policy no.',
      policySlug: 'Slug',
      policyType: 'Policy type',
      policyActive: 'Active',
      policyVersions: 'Wordings on file',
      policyUpdated: 'Last edited',
      policyMissing:
        'This policy has since been deleted. Everything shown is the copy written onto the record at the moment they accepted, which is why it still reads correctly.',
      policyIsCurrent: 'They accepted the wording still in force.',
      policyIsStale: 'The policy has been edited since. They agreed to an earlier wording.',

      versionLabel: 'Version {no}',
      versionCurrent: 'In force now',
      versionAccepted: 'They accepted this',
      versionBy: 'Edited by {name}',
      versionUnknownEditor: 'Editor not recorded',
      versionMissing:
        'The exact wording behind this record is not on file — it predates version history. The fingerprint above is still the record of what was agreed.',
      noVersions: 'No wording history yet.',
      readWording: 'Read this wording',
      wordingEmpty: 'This version has no content.',

      noPolicyHistory: 'This is their only acceptance of this policy.',
      noUserHistory: 'They have accepted nothing else.',
      historyCapped: 'Showing their 50 most recent acceptances. The table above holds them all.',
    },
  },
};
