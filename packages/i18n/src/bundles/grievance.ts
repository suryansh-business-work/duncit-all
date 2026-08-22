import type { NestedCatalogue } from '../catalogue';

/**
 * The grievance form's copy — a namespace of its own, like the media picker's.
 *
 * The same form is raised from mWeb, the native app AND the main website, so
 * its sentences belong to no single surface: MWEB_BUNDLE plus WEBSITE_BUNDLE
 * would be two hand-kept copies of a legally-published sentence, which is the
 * drift rule 27 exists to stop. One namespace, compiled into whichever build
 * imports it.
 *
 * Field labels are keyed `grievance.field.<name>` so `grievanceFieldLabelKey`
 * in @duncit/utils can name them from the shared spec.
 */
export const GRIEVANCE_BUNDLE: NestedCatalogue = {
  grievance: {
    title: 'Raise a grievance',
    subtitle: 'Tell us what went wrong and our Grievance Officer will look into it.',
    field: {
      name: 'Full name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      support_ticket_ref: 'Support ticket',
      subject: 'Subject',
      description: 'What happened?',
    },
    optional: 'Optional',
    descriptionHint: 'Include dates, pod names or order numbers if you have them.',
    submit: 'Submit grievance',
    submitting: 'Submitting…',
    successTitle: 'Grievance received',
    successBody: 'We have emailed you a copy. Quote this reference if you follow up.',
    referenceLabel: 'Reference number',
    raiseAnother: 'Raise another',
    failed: 'We could not submit your grievance. Please try again.',
    officerTitle: 'Grievance Officer',
    officerEmpty: 'Our Grievance Officer details will be published here shortly.',
    officerName: 'Name',
    officerEmail: 'Email',
    officerPhone: 'Phone',
    officerAddress: 'Address',
    errorRequired: '{field} is required',
    errorEmail: 'Enter a valid email address',
    errorPhone: 'Enter a valid phone number',
    errorTooLong: '{field} is too long',
    /**
     * The escalation ladder, shown as a numbered timeline above every grievance
     * form. Support first; the Grievance Officer only after support could not
     * settle it.
     */
    escalationTitle: 'Support first, grievance after',
    escalationWarning:
      'A grievance raised without a support ticket behind it will be rejected. Please raise a support ticket first and give our team a chance to resolve it.',
    step: {
      raise: {
        title: 'Raise a support ticket',
        body: 'Start with our support team. Almost every issue — refunds, pods, payouts, accounts — is settled there, and usually far faster.',
      },
      wait: {
        title: 'Let support try to resolve it',
        body: 'Reply on the ticket and give the team a chance to close it. A grievance filed while support is still working on it is sent back.',
      },
      escalate: {
        title: 'Only then, raise a grievance',
        body: 'If your support ticket could not be resolved, pick it below and our Grievance Officer takes it from there.',
      },
    },
    ticketSelectHint: 'Pick the support ticket this grievance is about.',
    ticketRefHint:
      'Your support ticket number, e.g. ST-A1B2C3. You will find it on the ticket in the app, or in the email we sent when you raised it.',
    ticketNonePlaceholder: 'Select a support ticket',
    // The website types the number in rather than picking it, so "Select…"
    // would be describing a control that is not on the page.
    ticketRefPlaceholder: 'e.g. ST-A1B2C3',
    ticketEmptyTitle: 'You have not raised a support ticket yet',
    ticketEmptyBody:
      'A grievance escalates a support ticket, so there has to be one first. Raise a support ticket and give our team a chance to resolve it — you can come back here if it is not settled.',
    ticketEmptyCta: 'Raise a support ticket',
  },
};
