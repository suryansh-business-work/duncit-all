import type { NestedCatalogue } from '../catalogue';

/**
 * Reporting a piece of content, and the Legal queue it lands in.
 *
 * One namespace file rather than two because they describe the same event from
 * both ends — the reason a person picks and the row a reviewer later reads —
 * and a report filed as "Nudity or sexual content" that shows up in the queue
 * as something else is the drift rules 27 and 40 exist to stop.
 *
 * `contentReport.*` is rendered by mWeb AND the native app, which must be
 * identical (rule 27). `reportLogs.*` is the Legal portal's own page, layered
 * over the shell's namespace by `mountPortal`.
 *
 * What is deliberately NOT keyed here: the reporter's own words, the caption of
 * the reported media, and the reviewer's resolution note. Those are data people
 * typed, not copy — a translator can no more own them than they can own a name.
 * The REASON is the opposite: the server stores `NUDITY`, never English, and
 * the label below is what turns it into a sentence, so re-wording a reason is a
 * bundle edit rather than a release of two apps and a portal.
 */
export const CONTENT_REPORT_BUNDLE: NestedCatalogue = {
  contentReport: {
    // The 3-dot menu on an open story. Delete is only rendered for someone the
    // server said may delete it; Report is rendered for everybody, which is the
    // whole point of having it.
    menuLabel: 'Story options',
    delete: 'Delete story',
    report: 'Report story',
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
    subtitle: 'Tell us what is wrong with it. Our Legal team reviews every report.',
    reasonLabel: 'What is wrong?',
    detailsLabel: 'Anything else we should know?',
    detailsPlaceholder: 'Add anything that helps us review this',
    reasonRequired: 'Pick a reason first',
    detailsRequired: 'Tell us what is wrong with this content',
    submit: 'Submit report',
    cancel: 'Cancel',
    submitted: 'Thanks — our Legal team will review this',
    submitFailed: 'Could not send your report',
    // The reasons. The server stores the enum; these are the only place the
    // wording lives, for all three surfaces.
    reasonSpam: 'Spam or misleading',
    reasonNudity: 'Nudity or sexual content',
    reasonViolence: 'Violence or dangerous acts',
    reasonHate: 'Hate speech or symbols',
    reasonHarassment: 'Harassment or bullying',
    reasonMisinformation: 'False information',
    reasonScam: 'Scam or fraud',
    reasonOther: 'Something else',
  },
  // The Legal portal's queue of everything users have reported.
  reportLogs: {
    title: 'Report By User',
    subtitle:
      'Everything users have reported from the app and mWeb, newest first. Each row keeps a copy of what was reported, because the original may already be gone.',
    colReportId: 'Report ID',
    colTarget: 'Reported',
    colReason: 'Reason',
    colReporter: 'Reported by',
    colOwner: 'Posted by',
    colStatus: 'Status',
    colReceived: 'Received',
    colActions: 'Actions',
    empty: 'Nobody has reported anything yet.',
    searchPlaceholder: 'Search report ID, caption or description',
    open: 'Open',
    // The detail dialog.
    detailTitle: 'Report {report_no}',
    detailPreview: 'What was reported',
    detailPreviewMissing: 'No preview was captured for this report.',
    detailDetails: 'In the reporter’s words',
    detailNoDetails: 'The reporter did not add anything.',
    detailResolution: 'What we did about it',
    detailResolutionPlaceholder: 'Record the action taken — staff only',
    detailStatus: 'Status',
    detailClose: 'Close',
    detailSave: 'Save',
    saved: 'Report updated',
    saveFailed: 'Could not update this report',
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
  },
};
