import type { NestedCatalogue } from '../catalogue';

/**
 * The public status page (status.duncit.com) and the Tech portal's Status
 * Reports section.
 *
 * ONE namespace for both on purpose (rule 34/40): the impact and triage
 * vocabulary is written by a visitor on the status page and read by an operator
 * in Tech, and two copies of it would let the dropdown say one thing while the
 * table beside it says another. The status site re-exports this slice as its
 * fallback bundle and the Tech portal layers it over its own, so both compile
 * the same words into their build.
 */
export const STATUS_BUNDLE: NestedCatalogue = {
  status: {
    loading: {
      board: 'Loading the service board',
      refreshing: 'Refreshing service status',
    },
    report: {
      heading: 'Report a problem',
      intro:
        'The board above watches whether each service answers. Plenty of breakage never shows up there — a page that will not load, a sign-in that loops, a payment that hangs. Tell us about it here.',
      open: 'Report a problem',
      cancel: 'Cancel',
      service: 'Affected service',
      serviceUnknown: 'Not sure / something else',
      impact: 'What is happening',
      name: 'Your name',
      email: 'Email',
      emailHelp: 'Only used to reply about this report.',
      pageUrl: 'Page address',
      pageUrlHelp: 'Optional — paste the address of the page where you saw it.',
      message: 'What went wrong',
      messageHelp: 'What you were doing, what you expected, and what happened instead.',
      submit: 'Send report',
      submitting: 'Sending…',
      successTitle: 'Report received',
      successBody: 'Thanks — this is with our team now. We will use your email if we need more.',
      sendAnother: 'Report something else',
      failure: 'Your report could not be sent. Check your connection and try again.',
      nameRequired: 'Please tell us your name.',
      nameLong: 'Please keep your name under 120 characters.',
      emailRequired: 'Please enter your email address.',
      emailInvalid: 'That does not look like an email address.',
      messageRequired: 'Please describe the problem.',
      messageShort: 'Please add a little more detail — at least 10 characters.',
      messageLong: 'Please keep the description under 4000 characters.',
      urlInvalid: 'That does not look like a web address.',
      screenshots: 'Screenshots',
      screenshotsHelp:
        'Optional, and the most useful thing you can send: a picture carries the error, the address bar and the state of the page at once. Up to 3 images, 5 MB each.',
      addScreenshot: 'Add an image',
      removeScreenshot: 'Remove this image',
      screenshotLimit: 'Up to 3 images can be attached to one report.',
      screenshotTooLarge: 'That image is over 5 MB. Please attach a smaller one.',
      screenshotUnreadable: 'That file could not be read. Please try a different image.',
    },
    impact: {
      cannotAccess: 'I cannot open it at all',
      errors: 'It shows an error',
      slow: 'It is very slow',
      login: 'I cannot sign in',
      payment: 'A payment failed or is stuck',
      other: 'Something else',
    },
    reportStatus: {
      new: 'New',
      inProgress: 'In progress',
      resolved: 'Resolved',
      closed: 'Closed',
    },
  },
};
