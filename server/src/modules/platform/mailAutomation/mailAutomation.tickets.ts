import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { TicketModel } from '@modules/support/ticket/ticket.model';
import { ticketNo } from '@modules/support/supportChat/unifiedTickets.service';
import { GrievanceTicketModel } from '@modules/content/grievance/grievanceTicket.model';
import {
  FeedbackReportModel,
  ReportProblemConfigModel,
  nextReportNo,
  type IReportProblemCategory,
} from '@modules/support/feedback/feedback.model';
import type { MailTicketType } from './mailAutomation.model';

/**
 * An inbound email, turned into a record in whichever queue the mailbox's rule
 * names. One module, three writers, because the three queues are genuinely
 * different records — a support ticket is a conversation, a grievance is a
 * legal filing with a clock, a problem report is a bug with a screenshot.
 *
 * Every one of them returns the human-readable number, because that number is
 * the whole point: it is what the auto-reply quotes back, and it is what the
 * sender puts in their next email so a human can find them again.
 */

export interface InboundEmail {
  fromEmail: string;
  fromName: string;
  subject: string;
  bodyText: string;
}

export interface OpenedTicket {
  ticket_id: Types.ObjectId;
  ticket_no: string;
}

/** The account behind the address, when there is one. An emailer may be a
 * stranger; every queue below copes with that, in its own way. */
async function accountFor(email: string) {
  return UserModel.findOne({ 'auth.email': email.toLowerCase() })
    .select('_id profile.first_name profile.last_name')
    .lean();
}

/**
 * The `maxlength` each target model enforces. An email is written by somebody
 * outside this system and is bounded by nothing — a 6,000-character complaint
 * or a 400-character subject line is ordinary mail, and either one throws a
 * Mongoose ValidationError on the way in.
 *
 * That throw is not a lost ticket, it is a wedged mailbox: the poller cannot
 * advance its history cursor past a message it failed to handle, so it replays
 * the same message every two minutes until Gmail expires the cursor a week
 * later and the whole backlog is skipped. Clamping here, at the one boundary
 * where outside text becomes our data, is what keeps that from ever starting.
 */
const LIMITS = {
  /** ticket.model.ts + grievanceTicket.model.ts both cap `subject`. */
  subject: 200,
  /** grievanceTicket.model.ts caps `description`; it is also REQUIRED. */
  grievanceDescription: 5000,
  /** ticket.model.ts caps `guest_name`; grievance caps `name` at the same. */
  name: 120,
} as const;

/** Trim, then cut to the model's limit. Never returns more than `max` chars. */
const clamp = (value: string, max: number): string => value.trim().slice(0, max);

const senderName = (input: InboundEmail, account: any): string => {
  const resolved =
    input.fromName ||
    [account?.profile?.first_name, account?.profile?.last_name].filter(Boolean).join(' ') ||
    input.fromEmail;
  return clamp(resolved, LIMITS.name);
};

const subjectOr = (input: InboundEmail, fallback: string) =>
  clamp(input.subject, LIMITS.subject) || fallback;

async function openSupportTicket(input: InboundEmail): Promise<OpenedTicket> {
  const account = await accountFor(input.fromEmail);
  const ticket = await TicketModel.create({
    user_id: account?._id ?? null,
    source: 'EMAIL',
    guest_name: senderName(input, account),
    guest_email: input.fromEmail,
    subject: subjectOr(input, 'Message by email'),
    category: 'GENERAL',
    status: 'OPEN',
    last_message_at: new Date(),
    messages: [
      {
        // The sender when there is an account; the ticket itself when there is
        // not, because a message has to say who wrote it. Same arrangement as
        // the website contact form.
        author_id: account?._id ?? new Types.ObjectId(),
        author_role: 'USER',
        body_text: input.bodyText,
        body_html: '',
        attachments: [],
      },
    ],
  });
  const id = ticket._id as Types.ObjectId;
  return { ticket_id: id, ticket_no: ticketNo('ST', id) };
}

async function openGrievance(input: InboundEmail): Promise<OpenedTicket> {
  const account = await accountFor(input.fromEmail);
  const grievance = await GrievanceTicketModel.create({
    user_id: account?._id ?? null,
    source: 'EMAIL',
    name: senderName(input, account),
    email: input.fromEmail,
    // No form, so no phone. The model allows it precisely for this.
    phone: '',
    subject: subjectOr(input, 'Grievance received by email'),
    // REQUIRED and length-capped. An image-only or signature-only mail parses
    // to an empty body, which would fail validation and wedge the poller — so
    // the record says plainly that the mail carried no text rather than
    // pretending the complaint was never made.
    description:
      clamp(input.bodyText, LIMITS.grievanceDescription) ||
      'The sender’s email carried no readable text. See the original message in the mailbox.',
    status: 'RECEIVED',
  });
  return {
    ticket_id: grievance._id as Types.ObjectId,
    ticket_no: grievance.grievance_no ?? '',
  };
}

/**
 * Which chip an emailed report is filed under.
 *
 * Read from the live Report a Problem config rather than written here, because
 * Support edits that list and a category this code invented would not be one
 * of the chips they filter by. OTHER when they keep one, otherwise whatever
 * they put last — the catch-all is conventionally at the end.
 */
async function emailReportCategory(): Promise<string> {
  const config = await ReportProblemConfigModel.findOne({ singleton_key: 'report_problem' }).lean();
  const categories = (config?.categories ?? []) as IReportProblemCategory[];
  // `filter` already hands back a new array, so sorting it in place mutates
  // nothing the caller can see.
  const active = categories.filter((c) => c.is_active);
  active.sort((a, b) => a.sort_order - b.sort_order);
  const other = active.find((c) => c.key.toUpperCase() === 'OTHER');
  return other?.key ?? active.at(-1)?.key ?? 'OTHER';
}

async function openProblemReport(input: InboundEmail): Promise<OpenedTicket> {
  const [account, category] = await Promise.all([accountFor(input.fromEmail), emailReportCategory()]);
  const report = await FeedbackReportModel.create({
    report_no: await nextReportNo(),
    user_id: account?._id ?? null,
    user_name: senderName(input, account),
    user_email: input.fromEmail,
    category,
    // The subject is context the in-app form never collects, and dropping it
    // would leave a report whose first line is a bare "hi". `message` is
    // required, so an empty mail still has to say something.
    message:
      [subjectOr(input, ''), input.bodyText].filter(Boolean).join('\n\n') ||
      'The sender’s email carried no readable text. See the original message in the mailbox.',
    media_urls: [],
    platform: 'email',
    source_screen: 'Mail Automation',
    status: 'OPEN',
    // Support's queue reads a null slack_error as "announced successfully" and
    // paints a green Sent chip. Nothing announced this one — the mail path has
    // no Slack step at all — so say that rather than claim a send that never
    // happened.
    slack_error: 'Not announced — opened by Mail Automation, which does not post to Slack.',
  });
  return { ticket_id: report._id as Types.ObjectId, ticket_no: report.report_no };
}

const OPENERS: Record<MailTicketType, (input: InboundEmail) => Promise<OpenedTicket>> = {
  SUPPORT: openSupportTicket,
  GRIEVANCE: openGrievance,
  REPORT_PROBLEM: openProblemReport,
};

/** File the email in the queue the mailbox's rule names. */
export function openTicketForEmail(
  type: MailTicketType,
  input: InboundEmail
): Promise<OpenedTicket> {
  return OPENERS[type](input);
}
