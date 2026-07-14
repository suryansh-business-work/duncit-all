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

  it('serves the newsletterSubscribersTable page with search, filters, sort and paging', async () => {
    await newsletterService.subscribe({ email: 'first@duncit.com', source: 'WEBSITE_FOOTER' });
    await newsletterService.subscribe({ email: 'second@duncit.com', source: 'MWEB' });
    await newsletterService.subscribe({ email: 'third@other.com', source: 'MWEB' });

    // Default sort created_at desc (newest first) + clamp defaults.
    const all = await newsletterService.table();
    expect(all.total).toBe(3);
    expect(all.rows[0].email).toBe('third@other.com');
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans email and source.
    const byEmail = await newsletterService.table({ search: 'second' });
    expect(byEmail.rows.map((s) => s.email)).toEqual(['second@duncit.com']);
    expect(byEmail.total).toBe(1);

    // Enum filter narrows.
    const mweb = await newsletterService.table({
      filters: [{ field: 'source', op: 'eq', value: 'MWEB' }],
    });
    expect(mweb.total).toBe(2);
    expect(mweb.rows.every((s) => s.source === 'MWEB')).toBe(true);

    // Allowlisted sort override + paging.
    const asc = await newsletterService.table({ sort_by: 'email', sort_dir: 'asc' });
    expect(asc.rows.map((s) => s.email)).toEqual([
      'first@duncit.com',
      'second@duncit.com',
      'third@other.com',
    ]);
    const page2 = await newsletterService.table({ page: 2, page_size: 1, sort_by: 'email', sort_dir: 'asc' });
    expect(page2.rows.map((s) => s.email)).toEqual(['second@duncit.com']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
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
