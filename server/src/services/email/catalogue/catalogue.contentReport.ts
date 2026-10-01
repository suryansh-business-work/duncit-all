import { CALM, callout, closing, intro, shell } from './mjml';
import { FOOTER, LABEL } from './catalogue.copy';
import { v, type EmailDef } from './catalogue.types';

/**
 * Legal > UGC Monitoring writing to somebody about a content report.
 *
 * One template for both recipients — the person who reported and the person
 * whose content it was — because the reviewer types the subject and the
 * message themselves: a take-down notice, a "we looked and it is fine", a
 * request for the original work in a copyright claim. The template only frames
 * those words with the report's reference, so the reader has something to
 * quote back. Seeded into Tech > Email Templates, where the MJML is edited
 * (rule 28).
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

export const CONTENT_REPORT_EMAILS: readonly EmailDef[] = [
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
