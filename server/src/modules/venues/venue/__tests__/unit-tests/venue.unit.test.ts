import { venueResolvers } from '../../venue.resolver';
import { makeContext } from '@test/harness';

describe('venue unit', () => {
  it('venues query is gated to admin review roles', async () => {
    await expect(
      (venueResolvers.Query as any).venues({}, {}, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });

  it('approveVenue is gated to admin review roles', async () => {
    await expect(
      (venueResolvers.Mutation as any).approveVenue({}, { venue_doc_id: 'x' }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
