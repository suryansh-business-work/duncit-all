import type { NestedCatalogue } from '../catalogue';

/**
 * What each kind of email IS, in the reader's language.
 *
 * Its own namespace, like the media picker's and the pod product picker's,
 * because three surfaces render the same nine names: mWeb and the native app on
 * the Mail Preferences screen (rule 27), and the Marketing portal on the Mail
 * Preference Analytics page. A second copy inside SHELL_BUNDLE is exactly the
 * drift rules 27 and 40 exist to stop — "Activity" and "Notifications" meaning
 * the same category on two screens is a support ticket waiting to happen.
 *
 * The `categories.*` keys are looked up BY the category the server sends
 * (`mailPreference.categories.marketing.label`), so the server never ships
 * English and adding a category is a bundle edit, not a client release.
 */
export const MAIL_PREFERENCE_BUNDLE: NestedCatalogue = {
  mailPreference: {
    // The screen itself — mWeb + native.
    title: 'Mail Preference',
    entryHint: 'Choose which emails we send you',
    subtitle: 'These are the emails we send to {email}.',
    optionalHeading: 'You can switch these off',
    requiredHeading: 'Always sent',
    requiredHint:
      'Codes, receipts and notices we are required to send. These cannot be switched off — without them you could not sign in or prove what you paid.',
    // The lock badge on a category nobody can switch off. There is deliberately
    // no `on`/`off` copy beside it: both switches announce their own state, and
    // a shipped key nothing renders is one an admin pays to translate for
    // nothing (rule 38).
    alwaysOn: 'Always on',
    unsubscribeAll: 'Unsubscribe from everything optional',
    resubscribeAll: 'Turn everything back on',
    unsubscribeAllTitle: 'Stop all optional email?',
    unsubscribeAllMessage:
      'You will stop getting campaigns, booking updates and support replies by email. Security codes, receipts and legal notices keep coming.',
    saved: 'Preferences updated',
    saveFailed: 'Could not save that. Please try again.',
    loadFailed: 'Could not load your mail preferences.',
    confirmationSent: 'We have emailed you a confirmation.',
    // The unsubscribe landing page, opened from a link in an email.
    linkTitle: 'Unsubscribe',
    linkInvalid:
      'This unsubscribe link is no longer valid. Sign in and open Mail Preference from your profile instead.',
    signIn: 'Sign in to manage preferences',
    // The nine categories, keyed by what the server sends.
    categories: {
      marketing: {
        label: 'Marketing',
        description: 'Campaigns, offers and product announcements.',
      },
      notification: {
        label: 'Activity',
        description: 'Changes to pods you joined, slot requests and other account activity.',
      },
      service: {
        label: 'From our team',
        description: 'Someone at Duncit writing to you directly, expecting a reply.',
      },
      support: {
        label: 'Support',
        description: 'Replies and transcripts for tickets and chats you started.',
      },
      transactional: {
        label: 'Confirmations',
        description: 'Your ticket, your welcome mail — the record of something you just did.',
      },
      authentication: {
        label: 'Security codes',
        description: 'One-time codes for signing in, resetting a password or deleting an account.',
      },
      billing: {
        label: 'Payments',
        description: 'Receipts, refunds and payout statements.',
      },
      legal: {
        label: 'Legal notices',
        description: 'Policy and account notices we are required to send you.',
      },
      internal: {
        label: 'Internal',
        description: 'Staff-only mail. Never sent to members.',
      },
    },
    // The Marketing portal's analytics page.
    analytics: {
      title: 'Mail Preference Analytics',
      subtitle:
        'Who has asked us to stop writing, about what, and from where. Every change is kept, so somebody who opted out and came back is still visible.',
      range: 'Range',
      rangeDays: 'Last {days} days',
      peopleOptedOut: 'People opted out',
      peopleOptedOutHint: 'Refusing at least one kind of email',
      peopleOptedOutAll: 'Fully opted out',
      peopleOptedOutAllHint: 'Refusing everything they are allowed to refuse',
      optOuts: 'Opt-outs',
      optOutsHint: 'In the selected range',
      optIns: 'Came back',
      optInsHint: 'Switched something back on',
      byCategory: 'By category',
      bySource: 'Where the change was made',
      optedOutNow: 'Opted out now',
      logTitle: 'Every change, per user',
      logEmpty: 'Nobody has changed their mail preferences yet.',
      logSearch: 'Search by email, category or surface',
      noSource: 'No changes in this range.',
      columnPerson: 'Person',
      columnCategory: 'Category',
      columnAction: 'Action',
      columnSource: 'Made from',
      columnWhen: 'When',
      actionOptOut: 'Opted out',
      actionOptIn: 'Opted back in',
    },
  },
};
