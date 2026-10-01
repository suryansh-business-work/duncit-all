import { sendEmail } from '@services/email/email.service';
import { escapeHtml } from '@utils/html';

interface ReportMessageInput {
  to: string;
  name: string;
  report_no: string;
  subject: string;
  message: string;
}

/**
 * A Legal reviewer's own words, to the reporter or to the content's owner.
 *
 * The body is whatever the reviewer typed, so it is escaped here: template
 * variables are substituted into compiled HTML as-is, and a message containing
 * a tag must arrive as the text the reviewer wrote. Line breaks are the one
 * piece of formatting kept, because a take-down notice is rarely one line.
 *
 * Answers with the reason when the mail did not go, so the reviewer is told
 * rather than left believing the person was written to.
 */
export async function sendContentReportMessage(input: ReportMessageInput): Promise<string | null> {
  const result = await sendEmail({
    to: input.to,
    subject: input.subject,
    template: 'content-report-message',
    category: 'legal',
    vars: {
      name: input.name,
      report_no: input.report_no,
      subject: input.subject,
      message: escapeHtml(input.message).replaceAll('\n', '<br />'),
    },
  });
  if (result.skipped) return result.reason ?? 'The email could not be sent';
  return null;
}

