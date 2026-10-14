import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { assertPortalLogin } from '@modules/portals';
import { ticketResolvers } from '../../ticket.resolver';
import { faqResolvers } from '@modules/support/faq/faq.resolver';
import { mailAutomationResolvers } from '@modules/platform/mailAutomation/mailAutomation.resolver';
import { FaqModel } from '@modules/support/faq/faq.model';

/**
 * SUPPORT_USER — "Support console access (agent level)".
 *
 * The server already let an agent work tickets, chats and feedback, but the
 * Support console only admitted SUPPORT_MANAGER, so the seat could not get in.
 * It now signs in; what stays a manager's job (writing FAQs, the mail
 * automation rules) still refuses it on the server.
 */

const ctxFor = (roles: string[]) =>
  ({ user: { id: new Types.ObjectId().toHexString(), roles } }) as unknown as GraphQLContext;
const agent = () => ctxFor(['SUPPORT_USER']);
const FORBIDDEN = { extensions: { code: 'FORBIDDEN' } };

describe('SUPPORT_USER — the Support agent seat', () => {
  it('signs in to the Support console', () => {
    expect(() => assertPortalLogin('support', ['SUPPORT_USER'])).not.toThrow();
    expect(() => assertPortalLogin('support', ['SUPPORT_MANAGER'])).not.toThrow();
    expect(() => assertPortalLogin('support', ['USER'])).toThrow('You do not have access to this portal');
  });

  it('works the ticket queue', async () => {
    const page = (await ticketResolvers.Query.tickets(undefined, {}, agent())) as { total: number };
    expect(page.total).toBe(0);
    await expect(Promise.resolve().then(() => ticketResolvers.Query.tickets(undefined, {}, ctxFor(['USER'])))).rejects.toMatchObject(FORBIDDEN);
  });

  it('is refused the manager-only FAQ writes, and nothing is written', async () => {
    const input = { question: 'Q?', answer: 'A.', category: 'General' };
    expect(() => faqResolvers.Mutation.createFaq(undefined, { input }, agent())).toThrow(
      expect.objectContaining(FORBIDDEN)
    );
    expect(() => faqResolvers.Mutation.deleteFaq(undefined, { faq_doc_id: new Types.ObjectId().toHexString() }, agent())).toThrow(
      expect.objectContaining(FORBIDDEN)
    );
    expect(await FaqModel.countDocuments()).toBe(0);
  });

  it('is refused the manager-only mail automation rules', () => {
    expect(() =>
      mailAutomationResolvers.Mutation.updateMailAutomationRule(undefined, { input: {} as never }, agent())
    ).toThrow(expect.objectContaining(FORBIDDEN));
  });
});
