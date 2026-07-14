jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));

import { contactService } from '../../contact.service';
import { ContactSubmissionModel } from '../../contact.model';

describe('contactService integration', () => {
  it('stores a valid submission and lists it', async () => {
    const res = await contactService.submit({
      name: 'Asha',
      email: 'asha@duncit.com',
      subject: 'Refund',
      message: 'I need help with a refund please',
    });
    expect(res.ok).toBe(true);
    expect(await contactService.list()).toHaveLength(1);
  });

  it('filters by status and email', async () => {
    await contactService.submit({ name: 'A', email: 'a@duncit.com', message: 'message one here' });
    await contactService.submit({ name: 'B', email: 'b@duncit.com', message: 'message two here' });

    expect(await contactService.list(undefined, 'a@duncit.com')).toHaveLength(1);
    expect(await contactService.list('NEW')).toHaveLength(2);
  });

  it('serves the contactSubmissionsTable page with search, filters, sort and paging', async () => {
    await contactService.submit({ name: 'Asha', email: 'asha@duncit.com', subject: 'Refund', message: 'refund my booking please' });
    await contactService.submit({ name: 'Bharat', email: 'bharat@duncit.com', subject: 'Partnership', message: 'venue partnership enquiry' });
    await contactService.submit({ name: 'Chitra', email: 'chitra@duncit.com', message: 'general question about pods' });
    const resolved = await ContactSubmissionModel.findOne({ email: 'asha@duncit.com' });
    await contactService.updateStatus(String(resolved!._id), 'RESOLVED');

    // Default sort created_at desc (newest first) + clamp defaults.
    const all = await contactService.table();
    expect(all.total).toBe(3);
    expect(all.rows[0].name).toBe('Chitra');
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans name, email and subject.
    const bySubject = await contactService.table({ search: 'partnership' });
    expect(bySubject.rows.map((c) => c.name)).toEqual(['Bharat']);
    expect(bySubject.total).toBe(1);

    // Enum status filter narrows.
    const newOnly = await contactService.table({
      filters: [{ field: 'status', op: 'eq', value: 'NEW' }],
    });
    expect(newOnly.rows.map((c) => c.name).toSorted()).toEqual(['Bharat', 'Chitra']);

    // Allowlisted sort override + paging.
    const asc = await contactService.table({ sort_by: 'name', sort_dir: 'asc' });
    expect(asc.rows.map((c) => c.name)).toEqual(['Asha', 'Bharat', 'Chitra']);
    const page2 = await contactService.table({ page: 2, page_size: 1, sort_by: 'name', sort_dir: 'asc' });
    expect(page2.rows.map((c) => c.name)).toEqual(['Bharat']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  it('updates status and rejects a missing id', async () => {
    await contactService.submit({ name: 'C', email: 'c@duncit.com', message: 'a longer message body' });
    const doc = await ContactSubmissionModel.findOne({ email: 'c@duncit.com' });

    const updated = await contactService.updateStatus(String(doc!._id), 'RESOLVED');
    expect(updated.status).toBe('RESOLVED');

    await expect(
      contactService.updateStatus('507f1f77bcf86cd799439011', 'CLOSED')
    ).rejects.toThrow(/not found/i);
  });
});
