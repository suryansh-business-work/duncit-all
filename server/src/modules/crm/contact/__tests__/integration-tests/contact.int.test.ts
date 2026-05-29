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
