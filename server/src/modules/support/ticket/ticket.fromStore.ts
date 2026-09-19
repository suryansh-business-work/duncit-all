import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { ticketNo } from '@modules/support/supportChat/unifiedTickets.service';
import { isEmailAddress } from '@utils/email';
import { TicketModel, type TicketCategory } from './ticket.model';

/**
 * Turn a message from the pet store's Contact page into a support ticket.
 *
 * Same arrangement as `ticket.fromContact.ts` for the main website: the queue
 * the support team already watches, with `source: 'STORE'` as the tag that
 * tells the ecomm team's tickets apart (the Support console filters on it).
 * A shopper may or may not be signed in — a signed-in one is attached to their
 * account so the thread also shows in their app; a guest's name and address
 * are what the ticket carries, and they are enough to reply to. The order
 * number, when given, goes into the subject where an agent scans for it.
 */
export interface StoreTicketInput {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  category?: string | null;
  message: string;
  order_no?: string | null;
}

const CATEGORIES = new Set<TicketCategory>(['GENERAL', 'PAYMENT', 'BOOKING', 'SAFETY', 'TECHNICAL', 'OTHER']);

const fail = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

/** The account behind the ticket: the signed-in one, else the one the email matches. */
async function accountFor(userId: string | null, email: string) {
  const query = userId && Types.ObjectId.isValid(userId) ? { _id: new Types.ObjectId(userId) } : { 'auth.email': email };
  return UserModel.findOne(query).select('_id profile.first_name profile.last_name').lean();
}

export async function ticketFromStore(userId: string | null, input: StoreTicketInput): Promise<{ ticket_no: string }> {
  const email = String(input.email ?? '').trim().toLowerCase();
  const subject = String(input.subject ?? '').trim().slice(0, 160);
  const message = String(input.message ?? '').trim();
  if (!isEmailAddress(email)) fail('Enter a valid email address');
  if (!subject) fail('Subject is required');
  if (!message) fail('Message is required');

  const account = await accountFor(userId, email);
  const typedName = String(input.name ?? '').trim().slice(0, 120);
  const accountName = [account?.profile?.first_name, account?.profile?.last_name].filter(Boolean).join(' ');
  const orderNo = String(input.order_no ?? '').trim().slice(0, 40);
  const phone = String(input.phone ?? '').trim().slice(0, 24);
  const category = String(input.category ?? '') as TicketCategory;
  const facts = [orderNo ? `Order: ${orderNo}` : '', phone ? `Phone: ${phone}` : ''].filter(Boolean);

  const ticket = await TicketModel.create({
    user_id: account?._id ?? null,
    source: 'STORE',
    guest_name: typedName || accountName || 'Store shopper',
    guest_email: email,
    subject: orderNo ? `[${orderNo}] ${subject}` : subject,
    category: CATEGORIES.has(category) ? category : 'GENERAL',
    status: 'OPEN',
    last_message_at: new Date(),
    messages: [
      {
        // The sender when there is an account; the ticket itself when there is
        // not, because a message has to say who wrote it and a guest has no id.
        author_id: account?._id ?? new Types.ObjectId(),
        author_role: 'USER',
        body_text: facts.length ? `${facts.join('\n')}\n\n${message}` : message,
        body_html: '',
        attachments: [],
      },
    ],
  });
  return { ticket_no: ticketNo('ST', ticket._id as Types.ObjectId) };
}
