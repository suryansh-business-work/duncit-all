import { contactService } from '../../contact.service';
import { contactResolvers } from '../../contact.resolver';
import { makeContext } from '@test/harness';

describe('contact unit', () => {
  it('rejects a submission with no name', async () => {
    await expect(
      contactService.submit({ name: '', email: 'a@b.com', message: 'hello there' } as any)
    ).rejects.toThrow(/name is required/i);
  });

  it('rejects a too-short message', async () => {
    await expect(
      contactService.submit({ name: 'Bob', email: 'a@b.com', message: 'hi' })
    ).rejects.toThrow();
  });

  it('contactSubmissions query is gated to admin roles', () => {
    expect(() =>
      (contactResolvers.Query as any).contactSubmissions({}, {}, makeContext({ roles: ['USER'] }))
    ).toThrow(/access denied/i);
  });
});
