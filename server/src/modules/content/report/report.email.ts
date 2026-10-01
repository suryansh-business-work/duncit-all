import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
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


/** The automatic emails a report sends — one template per moment, see catalogue.contentReport. */
export type ReportNoticeTemplate =
  | 'content-report-received'
  | 'content-report-actioned'
  | 'content-report-dismissed'
  | 'content-removed-owner';

export interface ReportNotice {
  template: ReportNoticeTemplate;
  userId: Types.ObjectId | string | null;
  report_no: string;
  /** The report category's current name. */
  reason: string;
}

/**
 * Send a report's automatic email to one person.
 *
 * The address and first name are read from the account here, so no caller
 * carries anybody's email. An account with no address is skipped. Never
 * throws: a mail that fails must not undo the report or the verdict it is
 * about, and sendEmail already records every outcome in the email log.
 */
export async function sendReportNotice(notice: ReportNotice): Promise<void> {
  if (!notice.userId) return;
  const user = await UserModel.findById(notice.userId)
    .select('auth.email profile.first_name')
    .lean<{ auth?: { email?: string }; profile?: { first_name?: string } }>();
  const to = user?.auth?.email?.trim();
  if (!to) return;
  await sendEmail({
    to,
    subject: notice.report_no,
    template: notice.template,
    category: 'legal',
    vars: {
      name: user?.profile?.first_name?.trim() || 'there',
      report_no: notice.report_no,
      reason: notice.reason,
    },
  });
}
