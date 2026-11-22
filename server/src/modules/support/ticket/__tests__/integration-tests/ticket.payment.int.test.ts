/**
 * A support ticket linked to a payment, against a real database: only the
 * raiser's own payment can be linked, a failed-payment claim finds the open
 * ticket about that payment, and a system resolution posts its bubble and mails
 * the raiser exactly once.
 */
jest.mock('@services/email/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendHtmlEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@services/notify/notify.service', () => ({ notifyEvent: jest.fn().mockResolvedValue(undefined) }));

import { Types } from 'mongoose';
import { sendEmail } from '@services/email/email.service';
import { UserModel } from '@modules/access/user/user.model';
import { PaymentModel } from '@modules/finance/payment/payment.model';
import { TicketModel } from '../../ticket.model';
import { ticketService } from '../../ticket.service';

const member = (first: string) =>
  UserModel.create({ auth: { email: `${first.toLowerCase()}-${new Types.ObjectId().toString()}@x.com` }, profile: { first_name: first } });

const paymentOf = (userId: unknown) =>
  PaymentModel.create({
    payment_id: `PAY-${new Types.ObjectId().toString()}`,
    user_id: userId,
    user_name: 'Asha',
    user_email: 'asha@x.com',
    subtotal: 499,
    total: 499,
    gateway: 'RAZORPAY',
  });

const ticketInput = (paymentId: string) => ({
  subject: 'Payment deducted but booking not completed',
  category: 'PAYMENT' as const,
  body_text: 'Money left my account.',
  payment_id: paymentId,
});

describe('tickets linked to a payment', () => {
  it('links the raiser’s own payment and shows it on the ticket', async () => {
    const asha = await member('Asha');
    const payment = await paymentOf(asha._id);
    const ticket = await ticketService.createTicket(String(asha._id), ticketInput(String(payment._id)));
    expect(ticket.payment_id).toBe(String(payment._id));
  });

  it('drops a payment that belongs to someone else, still opening the ticket', async () => {
    const [asha, ravi] = await Promise.all([member('Asha'), member('Ravi')]);
    const ravisPayment = await paymentOf(ravi._id);
    const ticket = await ticketService.createTicket(String(asha._id), ticketInput(String(ravisPayment._id)));
    expect(ticket.payment_id).toBeNull();
    expect(ticket.ticket_no).toMatch(/^ST-/);
  });

  it('finds the raiser’s open ticket about the payment, and only theirs', async () => {
    const [asha, ravi] = await Promise.all([member('Asha'), member('Ravi')]);
    const payment = await paymentOf(asha._id);
    const ticket = await ticketService.createTicket(String(asha._id), ticketInput(String(payment._id)));

    await expect(ticketService.findOpenForPayment(String(asha._id), String(payment._id))).resolves.toEqual({
      id: ticket.id,
      ticket_no: ticket.ticket_no,
      status: 'OPEN',
    });
    await expect(ticketService.findOpenForPayment(String(ravi._id), String(payment._id))).resolves.toBeNull();

    await TicketModel.updateOne({ _id: ticket.id }, { $set: { status: 'RESOLVED' } });
    await expect(ticketService.findOpenForPayment(String(asha._id), String(payment._id))).resolves.toBeNull();
  });

  it('resolves with a SYSTEM bubble and mails the raiser once, however often it is called', async () => {
    const [asha, finance] = await Promise.all([member('Asha'), member('Fin')]);
    const payment = await paymentOf(asha._id);
    const ticket = await ticketService.createTicket(String(asha._id), ticketInput(String(payment._id)));
    jest.mocked(sendEmail).mockClear();

    const resolved = await ticketService.systemResolve(ticket.id, String(finance._id), 'Your refund rfnd_1 has been processed.');
    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.messages.at(-1)).toMatchObject({ author_role: 'SYSTEM', body_text: 'Your refund rfnd_1 has been processed.' });
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const again = await ticketService.systemResolve(ticket.id, String(finance._id), 'Second note.');
    expect(again.messages).toHaveLength(resolved.messages.length + 1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
