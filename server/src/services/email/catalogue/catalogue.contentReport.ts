import { CALM, LIVE, STOPPED, callout, closing, intro, shell, type Tone } from './mjml';
import { FIELD, FOOTER, LABEL } from './catalogue.copy';
import { defineEmail, v, type EmailDef } from './catalogue.types';

/**
 * Legal > UGC Monitoring writing to somebody about a content report.
 *
 * One template for both recipients — the person who reported and the person
 * whose content it was — because the reviewer types the subject and the
 * message themselves: a take-down notice, a "we looked and it is fine", a
 * request for the original work in a copyright claim. The template only frames
 * those words with the report's reference, so the reader has something to
 * quote back.
 *
 * Every template here is seeded into the database on boot and edited in the
 * Communications portal's Email Templates (rule 28) — never as a local .mjml.
 */

const COPY_KEY = 'email.contentReportMessage';

/**
 * The reviewer's message, already escaped and with its line breaks kept
 * (`report.email`). Its own block rather than a detail row: a row is one bold
 * line, and a notice is usually several paragraphs.
 */
const MESSAGE_BLOCK = `    <mj-section background-color="#ffffff" padding="8px 20px">
      <mj-column>
        <mj-text color="#333333" line-height="1.6">{{message}}</mj-text>
      </mj-column>
    </mj-section>`;

/** Who an automatic report email is for, and the footer line that says why. */
const FOOTER_REPORTER = '{{t:email.contentReport.footerReporter}}';
const FOOTER_OWNER = '{{t:email.contentReport.footerOwner}}';

interface ReportStep {
  slug: string;
  name: string;
  description: string;
  fires: string;
  copyKey: string;
  subject: string;
  tone: Tone;
  footerNote: string;
}

/**
 * The emails a report sends by itself, one per moment in its life.
 *
 * None of them names the reporter to the owner or the owner to the reporter,
 * and none quotes a reviewer's note — those are staff-only. They carry the
 * report's reference and the category it was filed under, which is all either
 * person needs to follow it up.
 */
const REPORT_STEPS: readonly ReportStep[] = [
  {
    slug: 'content-report-received',
    name: 'Content Report Received',
    description: 'Tells a member their report of a post or story reached the Legal team.',
    fires: 'A member reports a post or story, or updates a report they already filed',
    copyKey: 'email.contentReportReceived',
    subject: 'We have your report — {{report_no}}',
    tone: CALM,
    footerNote: FOOTER_REPORTER,
  },
  {
    slug: 'content-report-actioned',
    name: 'Content Report Actioned',
    description: 'Tells the reporter that the content they reported was taken down.',
    fires: 'Legal takes reported content down on UGC Monitoring',
    copyKey: 'email.contentReportActioned',
    subject: 'We removed the content you reported — {{report_no}}',
    tone: LIVE,
    footerNote: FOOTER_REPORTER,
  },
  {
    slug: 'content-report-dismissed',
    name: 'Content Report Dismissed',
    description: 'Tells the reporter that the content they reported was reviewed and stays up.',
    fires: 'Legal marks reported content as fine on UGC Monitoring',
    copyKey: 'email.contentReportDismissed',
    subject: 'We reviewed the content you reported — {{report_no}}',
    tone: CALM,
    footerNote: FOOTER_REPORTER,
  },
  {
    slug: 'content-removed-owner',
    name: 'Content Removed (Owner)',
    description: 'Tells a member that a post or story they shared was taken down, and under which category.',
    fires: 'Legal takes a member’s post or story down on UGC Monitoring',
    copyKey: 'email.contentRemovedOwner',
    subject: 'We removed content you shared — {{report_no}}',
    tone: STOPPED,
    footerNote: FOOTER_OWNER,
  },
];

const reportStepEmail = (step: ReportStep): EmailDef =>
  defineEmail({
    slug: step.slug,
    name: step.name,
    description: step.description,
    audience: 'USER',
    category: 'legal',
    fires: step.fires,
    subject: step.subject,
    footerNote: step.footerNote,
    vars: [
      v('name', 'The first name of the person being written to.', 'Aarav'),
      v('report_no', 'The report’s reference, to quote in any reply.', 'RPT-000042'),
      v('reason', 'The report category it was filed under.', 'Copyright or trademark issue'),
    ],
    body: {
      copyKey: step.copyKey,
      nameVar: 'name',
      tone: step.tone,
      calloutLabelKey: LABEL.report,
      calloutVar: 'report_no',
      rows: [{ labelKey: FIELD.reason, valueVar: 'reason' }],
      helpKey: `${step.copyKey}.help`,
    },
  });

/**
 * A member blocked another account. Sent to the BLOCKER only — the blocked
 * member is never told, which is the point of a block.
 */
const PROFILE_BLOCKED_EMAIL: EmailDef = defineEmail({
  slug: 'profile-blocked',
  name: 'Profile Blocked',
  description: 'Confirms to a member that the account they blocked can no longer follow them or see their posts.',
  audience: 'USER',
  category: 'legal',
  fires: 'A member blocks another account from its profile',
  subject: 'You blocked {{blocked_name}}',
  footerNote: FOOTER.account,
  vars: [
    v('name', 'The first name of the member who made the block.', 'Aarav'),
    v('blocked_name', 'The name (or @handle) of the account they blocked.', 'Rohan Mehta'),
  ],
  body: {
    copyKey: 'email.profileBlocked',
    nameVar: 'name',
    tone: CALM,
    calloutLabelKey: LABEL.account,
    calloutVar: 'blocked_name',
    helpKey: 'email.profileBlocked.help',
  },
});

export const CONTENT_REPORT_EMAILS: readonly EmailDef[] = [
  ...REPORT_STEPS.map(reportStepEmail),
  PROFILE_BLOCKED_EMAIL,
  {
    slug: 'content-report-message',
    name: 'Content Report Message',
    description:
      'A Legal reviewer’s own message to the person who reported a post or story, or to the person who posted it.',
    audience: 'USER',
    category: 'legal',
    fires: 'A reviewer uses “Mail reporter” or “Mail owner” on Legal > UGC Monitoring',
    subject: '{{subject}}',
    footerNote: FOOTER.account,
    vars: [
      v('name', 'The first name of the person being written to.', 'Aarav'),
      v('report_no', 'The report’s reference, to quote in any reply.', 'RPT-000042'),
      v('subject', 'The subject line the reviewer typed.', 'About a post you reported'),
      v(
        'message',
        'The reviewer’s message, as HTML with its line breaks kept.',
        'Thanks for flagging this. We reviewed the post and removed it.'
      ),
    ],
    mjml: shell(
      `${COPY_KEY}.title`,
      [
        intro(`${COPY_KEY}.title`, `${COPY_KEY}.body`, 'name'),
        callout(CALM, LABEL.report, 'report_no'),
        MESSAGE_BLOCK,
        closing(`${COPY_KEY}.help`),
      ].join('\n')
    ),
  },
];
