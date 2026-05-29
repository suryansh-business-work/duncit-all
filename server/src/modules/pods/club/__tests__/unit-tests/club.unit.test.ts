import { clubService } from '../../club.service';
import { clubResolvers } from '../../club.resolver';
import { makeContext } from '@test/harness';

describe('club unit', () => {
  it('create requires a name (no derivable slug)', async () => {
    await expect(clubService.create({ club_name: '' })).rejects.toThrow(/club name is required/i);
  });

  it('createClub is gated to admin write roles', async () => {
    await expect(
      (clubResolvers.Mutation as any).createClub({}, { input: { club_name: 'X' } }, makeContext({ roles: ['USER'] }))
    ).rejects.toThrow(/access denied/i);
  });
});
