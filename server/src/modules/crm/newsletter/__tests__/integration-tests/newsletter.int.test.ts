jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { newsletterService } from '../../newsletter.service';
import { NewsletterSubscriberModel } from '../../newsletter.model';

describe('newsletterService integration', () => {
  it('subscribes a new email and lists it', async () => {
    const res = await newsletterService.subscribe({ email: 'a@duncit.com', source: 'MWEB' });
    expect(res.ok).toBe(true);
    expect(await newsletterService.list()).toHaveLength(1);
  });

  it('is idempotent for an already-subscribed email', async () => {
    await newsletterService.subscribe({ email: 'dup@duncit.com' });
    const again = await newsletterService.subscribe({ email: 'dup@duncit.com' });
    expect(again.ok).toBe(true);
    expect(await NewsletterSubscriberModel.countDocuments()).toBe(1);
  });

  it('unsubscribes then re-subscribes (clearing unsubscribed_at)', async () => {
    await newsletterService.subscribe({ email: 'back@duncit.com' });
    expect(await newsletterService.unsubscribe('back@duncit.com')).toBe(true);

    const sub = await NewsletterSubscriberModel.findOne({ email: 'back@duncit.com' });
    expect(sub?.unsubscribed_at).toBeTruthy();

    await newsletterService.subscribe({ email: 'back@duncit.com' });
    const after = await NewsletterSubscriberModel.findOne({ email: 'back@duncit.com' });
    expect(after?.unsubscribed_at).toBeNull();
  });
});
