import { CALM, LIVE, STOPPED, type Tone } from './mjml';
import { FIELD, FOOTER, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * A grievance's answer, one email per status Legal can move it to.
 *
 * `grievance-received` (catalogue.existing) is the acknowledgement; these are
 * what follows it. A grievance is a legal record with a clock on it, so the
 * complainant is told in writing each time it moves — and a closing status
 * carries the officer's resolution note, because "resolved" or "rejected"
 * without the reason is not an answer.
 */

interface GrievanceStep {
  slug: string;
  name: string;
  copyKey: string;
  subject: string;
  tone: Tone;
  fires: string;
  /** Closing statuses quote the officer's resolution note; review does not. */
  withResolution: boolean;
}

const GRIEVANCE_STEPS: readonly GrievanceStep[] = [
  {
    slug: 'grievance-in-review',
    name: 'Grievance In Review',
    copyKey: 'email.grievanceInReview',
    subject: 'Your grievance is in review — {{grievance_no}}',
    tone: CALM,
    fires: 'Legal moves a grievance to IN_REVIEW',
    withResolution: false,
  },
  {
    slug: 'grievance-resolved',
    name: 'Grievance Resolved',
    copyKey: 'email.grievanceResolved',
    subject: 'Your grievance is resolved — {{grievance_no}}',
    tone: LIVE,
    fires: 'Legal moves a grievance to RESOLVED',
    withResolution: true,
  },
  {
    slug: 'grievance-rejected',
    name: 'Grievance Rejected',
    copyKey: 'email.grievanceRejected',
    subject: 'About your grievance — {{grievance_no}}',
    tone: STOPPED,
    fires: 'Legal moves a grievance to REJECTED',
    withResolution: true,
  },
];

const grievanceEmail = (step: GrievanceStep): EmailDef =>
  defineEmail({
    slug: step.slug,
    name: step.name,
    description: 'The complainant, when the Legal portal changes their grievance’s status.',
    audience: 'PUBLIC',
    category: 'legal',
    fires: step.fires,
    subject: step.subject,
    footerNote: FOOTER.grievance,
    vars: [
      v('name', 'The complainant.', 'Aarav Sharma'),
      v('grievance_no', 'The reference to quote in any follow-up.', 'GRV-000042'),
      v('subject', 'What the grievance is about.', 'Refund not received for DUN-POD-4821'),
      v('resolution', 'The Grievance Officer’s note on the outcome.', 'Refund of ₹499 re-issued on 14 Sep.'),
    ],
    body: {
      copyKey: step.copyKey,
      nameVar: 'name',
      tone: step.tone,
      calloutLabelKey: LABEL.grievance,
      calloutVar: 'grievance_no',
      rows: step.withResolution
        ? [
            { labelKey: FIELD.subject, valueVar: 'subject' },
            { labelKey: FIELD.resolution, valueVar: 'resolution' },
          ]
        : [{ labelKey: FIELD.subject, valueVar: 'subject' }],
      helpKey: 'email.grievance.footer',
    },
  });

export const GRIEVANCE_EMAILS: readonly EmailDef[] = GRIEVANCE_STEPS.map(grievanceEmail);
