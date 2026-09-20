import { shell } from './mjml';
import { v, type EmailDef } from './catalogue.types';

/**
 * The one general-purpose email an automation flow can send without a template
 * written for it: a heading, a greeting and a body the flow fills in — from an
 * AI step, a variable, or text typed into the step.
 *
 * Seeded into Tech > Email Templates like every other row (rule 28), so its
 * MJML is edited there and never here. A flow may pick any other template
 * too; this one exists so the first flow does not need a Tech ticket first.
 */

const BODY = `    <mj-section background-color="#ffffff" padding="24px 20px 8px 20px">
      <mj-column>
        <mj-text font-size="22px" font-weight="bold" color="#222222">{{heading}}</mj-text>
        <mj-text color="#555555">{{t:email.common.greeting}} {{name}},</mj-text>
        <mj-text color="#555555" line-height="1.6">{{body}}</mj-text>
      </mj-column>
    </mj-section>`;

export const AUTOMATION_EMAILS: readonly EmailDef[] = [
  {
    slug: 'automation-message',
    name: 'Automation Message',
    description:
      'A general-purpose message an AI portal automation flow sends: a heading and a body the flow fills in, inside the standard header and footer.',
    audience: 'USER',
    category: 'notification',
    fires: 'A Send email step in AI > Automation picks this template',
    subject: '{{heading}}',
    footerNote: '{{t:email.automationMessage.footer}}',
    vars: [
      v('name', 'Who the message is for.', 'Aarav Sharma'),
      v('heading', 'The line at the top, and the subject unless the step overrides it.', 'Thanks for writing in'),
      v('body', 'The message itself. Plain text; line breaks are kept.', 'We have your question and will get back to you within a day.'),
    ],
    mjml: shell('email.automationMessage.title', BODY),
  },
];
