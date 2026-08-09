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
  },
};
