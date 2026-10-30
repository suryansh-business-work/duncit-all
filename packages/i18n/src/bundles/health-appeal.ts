import type { NestedCatalogue } from '../catalogue';

/**
 * Appealing a health deduction, and the Legal desk it lands on.
 *
 * One namespace file for both ends of the same event, as content-report does:
 * the reason a person picks in the app and the row Legal later reads must say
 * the same thing (rules 27 + 40).
 *
 * `healthAppeal.*` is rendered by mWeb AND the native app on the account- and
 * venue-health history, and its reason and status labels by the Legal queue
 * too. `healthAppeals.*` is the Legal portal's Account Health Appeals page.
 *
 * NOT keyed: the deduction's remark, what the person wrote and Legal's note —
 * those are the record, not copy.
 */
export const HEALTH_APPEAL_BUNDLE: NestedCatalogue = {
  healthAppeal: {
    appeal: 'Appeal',
    // The row's button names the deduction it acts on, for a screen reader.
    appealNamed: 'Appeal the {points} point deduction',
    title: 'Appeal this deduction',
    subtitle: 'Tell our Legal team why these points should be given back. They review every appeal.',
    deductionLine: '{points} points · {remark}',
    reasonLabel: 'Why are you appealing?',
    reason: {
      wontHappenAgain: 'It won’t happen again',
      incorrect: 'This is a mistake',
    },
    messageLabel: 'Tell us more',
    messagePlaceholder: 'What happened, and anything that helps Legal decide',
    reasonRequired: 'Pick a reason first',
    messageRequired: 'Tell us why in a few words',
    messageTooLong: 'Please keep it under {max} characters',
    submit: 'Send appeal',
    sending: 'Sending…',
    cancel: 'Cancel',
    submitted: 'Appeal sent. Legal will review it, and we will let you know.',
    submitFailed: 'Could not send your appeal',
    done: 'Done',
    // Beside the deduction once an appeal is filed. "Accepted" also explains
    // why that deduction is faded: it no longer counts.
    status: {
      pending: 'Appeal pending',
      accepted: 'Appeal accepted',
      denied: 'Appeal not accepted',
    },
  },
  // Legal > Account Health Appeals.
  healthAppeals: {
    pageTitle: 'Account Health Appeals',
    pageSubtitle:
      'Deductions that hosts, venues and members have appealed from the app and mWeb. Accept to give the points back, or deny to keep the deduction. They are told either way, in the app and by email.',
    colAppealId: 'Appeal ID',
    colAccount: 'Account',
    colType: 'Type',
    colDeduction: 'Points',
    colRemark: 'Deducted for',
    colReason: 'Appeal reason',
    colMessage: 'What they said',
    colAppellant: 'Appealed by',
    colStatus: 'Status',
    colSubmitted: 'Submitted',
    colDecidedBy: 'Decided by',
    colActions: 'Actions',
    typeUser: 'Account',
    typeVenue: 'Venue',
    empty: 'No appeals yet.',
    searchPlaceholder: 'Search appeal ID, account, deduction or message',
    acceptNamed: 'Accept {appeal_no}',
    denyNamed: 'Deny {appeal_no}',
    acceptTitle: 'Accept this appeal?',
    acceptBody:
      'The deduction is lifted and the points go back on their health score. They are told in the app and by email.',
    acceptCta: 'Accept appeal',
    denyTitle: 'Deny this appeal?',
    denyBody: 'The deduction stays. They are told in the app and by email, with your note.',
    denyCta: 'Deny appeal',
    decisionSubject: '{appeal_no} · {account}',
    noteLabel: 'Note to them',
    notePlaceholder: 'Optional when accepting; say why when denying',
    noteRequired: 'Say why the appeal is denied — they will read this',
    noteTooLong: 'Please keep the note under {max} characters',
    accepted: 'Appeal accepted',
    denied: 'Appeal denied',
    actionFailed: 'Could not update this appeal',
  },
};
