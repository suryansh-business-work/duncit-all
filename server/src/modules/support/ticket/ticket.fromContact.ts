import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { TicketModel } from './ticket.model';

/**
 * Turn a message from the website's contact form into a support ticket.
 *
 * The contact form used to write to a collection only the CRM ever read, so a
 * question asked on duncit.com and the same question asked in the app landed in
 * two different places and only one of them had an agent watching it. This puts
 * both in the queue; the `source` column is what tells them apart.
 *
 * The sender may have no account — anyone can use that form. When their address
 * DOES match one, the ticket is attached to it, so the same conversation shows
 * up in their app rather than starting a second one they cannot see. When it
 * does not, the name and address they typed are all the ticket carries, and
 * they are enough to reply to.
 *
 * Its own module rather than a method on ticketService: the CRM's contact
 * service reaches for it, and importing the whole ticket service — with its
 * mailers and its socket — for one write would drag all of that in behind it.
 */
export async function ticketFromContact(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments: string[];
}): Promise<void> {
  const account = await UserModel.findOne({ 'auth.email': input.email.toLowerCase() })
    .select('_id profile.first_name profile.last_name')
    .lean();

  const authorName =
    input.name ||
    [account?.profile?.first_name, account?.profile?.last_name].filter(Boolean).join(' ') ||
    'Website visitor';

  await TicketModel.create({
    user_id: account?._id ?? null,
    source: 'WEBSITE',
    guest_name: input.name,
    guest_email: input.email,
    subject: input.subject || 'Message from the website',
    category: 'GENERAL',
    status: 'OPEN',
    last_message_at: new Date(),
    messages: [
      {
        // The sender when there is an account; the ticket itself when there is
        // not, because a message has to say who wrote it and a guest has no id.
        author_id: (account?._id as Types.ObjectId | undefined) ?? new Types.ObjectId(),
        author_role: 'USER',
        author_name: authorName,
        author_photo: '',
        body_text: input.message,
        body_html: '',
        attachments: input.attachments,
      },
    ],
  });
}
