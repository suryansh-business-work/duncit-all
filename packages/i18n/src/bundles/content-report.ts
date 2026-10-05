import type { NestedCatalogue } from '../catalogue';

/**
 * Reporting a piece of content, and the Legal desk it lands on.
 *
 * One namespace file rather than two because they describe the same event from
 * both ends — the reason a person picks and the row a reviewer later reads —
 * and a report that reads one way in the app and another in the queue is the
 * drift rules 27 and 40 exist to stop.
 *
 * `contentReport.*` is rendered by mWeb AND the native app, which must be
 * identical (rule 27). `reportLogs.*` is the Legal portal's UGC Monitoring
 * page, layered over the shell's namespace by `mountPortal`.
 *
 * What is deliberately NOT keyed here: the reporter's own words, the caption of
 * the reported media, a reviewer's note or mail — and the report CATEGORIES.
 * Those are all data somebody typed, not copy. The categories in particular are
 * a list Legal manages (UGC Monitoring > Settings) so that adding "Copyright"
 * is a row in a table rather than a release of two apps and a portal.
 */
export const CONTENT_REPORT_BUNDLE: NestedCatalogue = {
  contentReport: {
    // The 3-dot menu on an open story or post. Delete is only rendered for
    // someone the server said may delete it; Report is rendered for everybody
    // else, which is the whole point of having it.
    menuLabel: 'Story options',
    menuLabelPost: 'Post options',
    delete: 'Delete story',
    report: 'Report story',
    reportPost: 'Report post',
    // Deleting a story is immediate and total — there is no bin to fish it out
    // of — so it asks first, on both surfaces.
    deleteConfirmTitle: 'Delete this story?',
    deleteConfirmBody:
      'It disappears for everyone straight away, and it cannot be brought back.',
    deleteConfirmCta: 'Delete',
    deleteCancel: 'Keep it',
    deleted: 'Story deleted',
    deleting: 'Deleting…',
    deleteFailed: 'Could not delete this story',
    // The report sheet/dialog.
    title: 'Report this story',
    titlePost: 'Report this post',
    subtitle: 'Tell us what is wrong with it. Our Legal team reviews every report.',
    reasonLabel: 'What is wrong?',
    detailsLabel: 'Anything else we should know?',
    detailsPlaceholder: 'Add anything that helps us review this',
    reasonRequired: 'Pick a reason first',
    detailsRequired: 'Tell us what is wrong with this content',
    submit: 'Submit report',
    cancel: 'Cancel',
    submitted: 'Thanks — our Legal team will review this',
    // The confirmation after a report lands. The reference is the one the
    // acknowledgement email carries, so the two can be matched up.
    submittedTitle: 'Report received',
    submittedRef: 'Thanks — our Legal team will review this. Your reference is {ref}.',
    sending: 'Sending your report',
    done: 'Done',
    submitFailed: 'Could not send your report',
    // The reasons themselves come from the server; these cover the moments
    // before they arrive and the case where they do not.
    categoriesLoading: 'Loading the report options',
    categoriesFailed: 'Could not load the report options',
    categoriesRetry: 'Try again',
    // A member's profile: its 3-dot menu offers Block and Report. A block is
    // never announced to the blocked member, and the copy says so.
    titleProfile: 'Report this profile',
    profileMenuLabel: 'Profile options',
    reportProfile: 'Report profile',
    block: 'Block',
    unblock: 'Unblock',
    blockConfirmTitle: 'Block {name}?',
    blockConfirmBody:
      'They will not be able to follow you or see your posts and stories, and you will not see theirs. Any follow between you is removed. They will not be told.',
    unblockConfirmTitle: 'Unblock {name}?',
    unblockConfirmBody:
      'They will be able to see your public posts and follow you again. Follows removed by the block do not come back.',
    blocking: 'Blocking…',
    unblocking: 'Unblocking…',
    blockedToast: '{name} is blocked',
    unblockedToast: '{name} is unblocked',
    blockFailed: 'Could not block this account',
    unblockFailed: 'Could not unblock this account',
    blockedNotice: 'You blocked this account. Their posts and stories are hidden from you, and they cannot see yours.',
  },
  // Legal > UGC Monitoring: the reported-content queue and its settings.
  reportLogs: {
    pageTitle: 'UGC Monitoring',
    pageSubtitle:
      'Posts and stories that people reported from the app and mWeb. Review each one, take it down or mark it as fine, and write to the people involved.',
    tabsLabel: 'UGC Monitoring sections',
    tabReported: 'Reported content',
    tabSettings: 'Settings',
    colReportId: 'Report ID',
    colTarget: 'Reported',
    colReason: 'Reason',
    colReporter: 'Reported by',
    colOwner: 'Posted by',
    colReports: 'Reports',
    colContent: 'Content',
    colStatus: 'Status',
    colReceived: 'Received',
    colActions: 'Actions',
    empty: 'Nobody has reported anything yet.',
    searchPlaceholder: 'Search report ID, caption or description',
    open: 'Open',
    // Whether the reported thing can still be seen by everyone.
    contentLive: 'Live',
    contentRemoved: 'Taken down',
    contentGone: 'No longer available',
    // The four things a reviewer does from a row.
    takeDown: 'Take down',
    looksGood: 'Looks good',
    mailReporter: 'Mail reporter',
    mailOwner: 'Mail owner',
    // The same actions as each row's icon buttons name them. A tooltip becomes
    // the button's accessible name, so it has to say WHICH report it acts on —
    // twenty buttons all called "Take down" are twenty the same to a screen reader.
    openNamed: 'Open {report_no}',
    takeDownNamed: 'Take down the content in {report_no}',
    looksGoodNamed: 'Mark the content in {report_no} as fine',
    mailReporterNamed: 'Mail the reporter of {report_no}',
    mailOwnerNamed: 'Mail the owner of the content in {report_no}',
    // A take-down cannot be undone, so it names what it is about to remove.
    takeDownTitle: 'Take this content down?',
    takeDownBody:
      'It is removed for everyone straight away and cannot be brought back. Every open report on it is closed as actioned.',
    takeDownCta: 'Take down',
    looksGoodTitle: 'Mark this content as fine?',
    looksGoodBody:
      'The content stays up. Every open report on it is closed as dismissed.',
    looksGoodCta: 'Looks good',
    decisionSubject: '{target} by {owner} · {report_no}',
    decisionNote: 'Note',
    decisionNotePlaceholder: 'Why you decided this — staff only',
    decisionNoteTooLong: 'Keep the note under 5,000 characters',
    takenDown: 'Content taken down',
    markedOk: 'Reports closed as fine',
    actionFailed: 'Could not update this report',
    // Writing to the reporter or to the content's owner.
    mailTitleReporter: 'Mail the reporter',
    mailTitleOwner: 'Mail the content owner',
    mailTo: 'To {name}',
    mailHint:
      'Sent from Duncit Legal with the report reference {report_no}. The address is read from their account.',
    mailSubject: 'Subject',
    mailSubjectPlaceholder: 'About a post you reported',
    mailMessage: 'Message',
    mailMessagePlaceholder: 'Write what you want to tell them',
    mailSubjectRequired: 'Add a subject',
    mailSubjectTooLong: 'Keep the subject under 150 characters',
    mailMessageRequired: 'Write a message',
    mailMessageTooLong: 'Keep the message under 5,000 characters',
    mailSend: 'Send mail',
    mailSent: 'Mail sent',
    mailFailed: 'Could not send this mail',
    // The detail dialog.
    detailTitle: 'Report {report_no}',
    detailPreview: 'What was reported',
    detailPreviewMissing: 'No preview was captured for this report.',
    detailDetails: 'In the reporter’s words',
    detailNoDetails: 'The reporter did not add anything.',
    detailResolution: 'What we did about it',
    detailResolutionPlaceholder: 'Record the action taken — staff only',
    detailStatus: 'Status',
    detailReportCount: 'Reports on this content: {count}',
    detailHistory: 'Activity',
    detailNoHistory: 'Nothing has been done about this report yet.',
    detailHistoryBy: '{name} · {when}',
    detailClose: 'Close',
    detailSave: 'Save',
    saved: 'Report updated',
    saveFailed: 'Could not update this report',
    // What each line of the activity log says happened.
    actionTakenDown: 'Took the content down',
    actionLooksGood: 'Marked the content as fine',
    actionMailReporter: 'Mailed the reporter',
    actionMailOwner: 'Mailed the content owner',
    actionStatusChanged: 'Changed the status',
    // Status wording, shared by the chip and the picker.
    statusReceived: 'Received',
    statusInReview: 'In review',
    statusActioned: 'Actioned',
    statusDismissed: 'Dismissed',
    // What kind of thing was reported.
    targetStory: 'Story',
    targetPost: 'Post',
    targetPod: 'Pod',
    targetClub: 'Club',
    targetProfile: 'Profile',
    targetProduct: 'Product',
    // Settings: the categories the report dialog offers.
    settingsTitle: 'Report categories',
    settingsSubtitle:
      'The reasons a person can pick when they report a post or story. A change here shows in the app and mWeb straight away.',
    addCategory: 'Add category',
    editCategory: 'Edit category',
    colCategory: 'Category',
    colNeedsDetails: 'Description from reporter',
    colShown: 'Shown in app',
    needsDetailsYes: 'Required',
    needsDetailsNo: 'Optional',
    categoriesEmpty: 'No report categories yet. Add one so people can report content.',
    categorySearch: 'Search categories',
    categoryName: 'Category name',
    categoryNamePlaceholder: 'Copyright issue',
    categoryNameHint: 'What a person reads in the report dialog.',
    categoryDescription: 'Description',
    categoryDescriptionPlaceholder: 'It uses work or a brand that belongs to someone else.',
    categoryDescriptionHint: 'Optional. A short line under the name that says what belongs here.',
    categoryRequiresDetails: 'Ask the reporter to describe the problem',
    categoryRequiresDetailsHint:
      'Turn on for a category that says nothing on its own, such as “Something else”.',
    categoryOrder: 'Position in the list',
    categoryOrderHint: 'Lower numbers show first. Leave it blank to put a new category last.',
    categoryActive: 'Show in the report dialog',
    categoryActiveHint: 'Switch off to hide it and keep the reports already filed under it.',
    categoryNameRequired: 'Give the category a name',
    categoryNameTooLong: 'Keep the name under 80 characters',
    categoryDescriptionTooLong: 'Keep the description under 200 characters',
    categoryOrderInvalid: 'Enter a whole number, 0 or more',
    categorySaved: 'Category saved',
    categoryDeleted: 'Category deleted',
    categorySaveFailed: 'Could not save this category',
    categoryDeleteFailed: 'Could not delete this category',
    // Blocked accounts: every block members have made, kept after an unblock.
    tabBlocked: 'Blocked accounts',
    blockColBlocker: 'Blocked by',
    blockColBlocked: 'Blocked account',
    blockColStatus: 'Status',
    blockColBlockedAt: 'Blocked on',
    blockColUnblockedAt: 'Unblocked on',
    blockActive: 'Blocked',
    blockLifted: 'Unblocked',
    blocksEmpty: 'Nobody has blocked anyone yet.',
    blocksSearch: 'Search by name or @handle',
    categoryDeleteTitle: 'Delete this category?',
    categoryDeleteBody:
      '“{name}” leaves the report dialog for good. A category that reports were filed under cannot be deleted. Switch it off instead.',
  },
};
