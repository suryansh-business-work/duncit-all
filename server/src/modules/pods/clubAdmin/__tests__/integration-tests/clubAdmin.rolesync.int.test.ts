import { Types } from 'mongoose';

// Role grant/revoke goes through userService, which uses a Mongo transaction —
// unavailable on the single-node test mongo. Mock it so we assert the wiring
// (which users get CLUB_ADMIN added/removed) rather than the transaction itself.
jest.mock('@modules/access/user/user.service', () => ({
  userService: { addRole: jest.fn(), removeRole: jest.fn() },
}));

import { userService } from '@modules/access/user/user.service';
import { clubService } from '@modules/pods/club/club.service';
import { ClubModel } from '@modules/pods/club/club.model';

const addRole = userService.addRole as jest.Mock;
const removeRole = userService.removeRole as jest.Mock;

const uid = () => new Types.ObjectId().toString();
const seedClub = (over: Record<string, unknown> = {}) =>
  ClubModel.create({
    club_id: `c-${Math.random().toString(36).slice(2)}`,
    club_name: 'Club',
    ...over,
  });

beforeEach(() => {
  addRole.mockReset();
  removeRole.mockReset();
});

describe('club admin role sync', () => {
  it('grants CLUB_ADMIN on assignment and stores the ids', async () => {
    const user = uid();
    const club = await seedClub();
    await clubService.update(String(club._id), { admin_user_ids: [user] });

    expect(addRole).toHaveBeenCalledWith(user, 'CLUB_ADMIN');
    const fresh = await ClubModel.findById(club._id);
    expect((fresh?.admin_user_ids ?? []).map(String)).toEqual([user]);
  });

  it('revokes CLUB_ADMIN when the user no longer administers any club', async () => {
    const user = uid();
    const club = await seedClub();
    await clubService.update(String(club._id), { admin_user_ids: [user] });
    addRole.mockReset();

    await clubService.update(String(club._id), { admin_user_ids: [] });
    expect(removeRole).toHaveBeenCalledWith(user, 'CLUB_ADMIN');
  });

  it('keeps CLUB_ADMIN when the user still administers another club', async () => {
    const user = uid();
    const a = await seedClub({ admin_user_ids: [user] });
    await seedClub({ admin_user_ids: [user] });

    await clubService.update(String(a._id), { admin_user_ids: [] });
    expect(removeRole).not.toHaveBeenCalled();
  });

  it('grants on create when admins are assigned up front', async () => {
    const user = uid();
    await clubService.create({ club_name: 'Fresh Club', admin_user_ids: [user] });
    expect(addRole).toHaveBeenCalledWith(user, 'CLUB_ADMIN');
  });

  it('revokeAdminForUser pulls the user out of every club', async () => {
    const user = uid();
    await seedClub({ admin_user_ids: [user] });
    await seedClub({ admin_user_ids: [user, uid()] });
    await clubService.revokeAdminForUser(user);
    const remaining = await ClubModel.find({ admin_user_ids: new Types.ObjectId(user) });
    expect(remaining).toHaveLength(0);
  });
});
