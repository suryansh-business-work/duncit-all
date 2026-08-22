/**
 * The Club Admin onboarding record, with every collaborator faked.
 *
 * Three rules here have consequences beyond the table. A REJECT is recorded as
 * a decision rather than a not-yet — "somebody looked and said no" has to be
 * distinguishable from "nobody has looked". Deleting the record unassigns the
 * person from every club but leaves their login and role alone, because a club
 * whose admin no longer exists is an orphan nobody notices until it matters.
 * And a no-op activation sends no message: an account WhatsApp carries no
 * entity for the duplicate index to key on, so pressing Deactivate twice would
 * otherwise be two billed messages.
 */
import { Types } from 'mongoose';

jest.mock('@observability/log', () => ({
  logs: { server: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } },
}));
jest.mock('./../../clubAdminProfile.model', () => ({
  ClubAdminProfileModel: {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  },
}));
jest.mock('@modules/clubs/club/club.model', () => ({
  ClubModel: { find: jest.fn(), updateMany: jest.fn() },
}));
jest.mock('@modules/pods/category/category.model', () => ({ CategoryModel: { find: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findById: jest.fn(), find: jest.fn() } }));
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({
  whatsappService: { send: jest.fn() },
}));
jest.mock('@modules/venues/entityIdCounter', () => ({ nextEntityNo: jest.fn() }));
jest.mock('@utils/table-query', () => {
  const actual = jest.requireActual('@utils/table-query');
  return { ...actual, runTableQuery: jest.fn() };
});

import { ClubAdminProfileModel } from '../../clubAdminProfile.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { CategoryModel } from '@modules/pods/category/category.model';
import { UserModel } from '@modules/access/user/user.model';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { runTableQuery } from '@utils/table-query';
import { clubAdminProfileService } from '../../clubAdminProfile.service';

const profiles = ClubAdminProfileModel as unknown as Record<string, jest.Mock>;
const clubs = ClubModel as unknown as Record<string, jest.Mock>;
const categories = CategoryModel as unknown as Record<string, jest.Mock>;
const users = UserModel as unknown as Record<string, jest.Mock>;
const whatsapp = whatsappService as unknown as Record<string, jest.Mock>;
const tableQuery = runTableQuery as unknown as jest.Mock;

const ID = '65b000000000000000000001';
const USER_ID = '65b000000000000000000002';
const CLUB_A = '65b000000000000000000003';
const CLUB_B = '65b000000000000000000004';

/** `find().select().lean()` / `findById().select().lean()` as one chain. */
const chain = (value: unknown) => ({
  select: () => chain(value),
  sort: () => chain(value),
  lean: () => Promise.resolve(value),
});

const profile = (over: Record<string, unknown> = {}) => ({
  _id: ID,
  club_admin_no: 'DUN-CA-001',
  user_id: new Types.ObjectId(USER_ID),
  full_name: 'Meera N',
  email: 'meera@duncit.com',
  phone: '9000000001',
  super_category_id: null,
  category_id: null,
  sub_category_id: null,
  status: 'PENDING',
  is_active: false,
  commission_pct: null,
  joined_at: null,
  approved_at: null,
  reviewer_notes: null,
  request_no: 'DUN-REQ-001',
  created_at: new Date('2026-08-01T00:00:00.000Z'),
  save: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  categories.find.mockReturnValue(chain([]));
  clubs.find.mockReturnValue(chain([]));
  clubs.updateMany.mockResolvedValue({});
  users.findById.mockReturnValue(chain({ auth: { phone: { number: '9000000001' } } }));
  whatsapp.send.mockResolvedValue(undefined);
});

describe('table', () => {
  it('hands the generic table query the rows, enriched', async () => {
    tableQuery.mockResolvedValue({ docs: [profile()], total: 1, page: 1, page_size: 25 });

    const result = await clubAdminProfileService.table();

    expect(result.total).toBe(1);
    expect(result.rows[0]).toMatchObject({ club_admin_no: 'DUN-CA-001', full_name: 'Meera N' });
  });

  it('answers an empty page without asking for names or clubs it does not need', async () => {
    tableQuery.mockResolvedValue({ docs: [], total: 0, page: 1, page_size: 25 });

    expect((await clubAdminProfileService.table()).rows).toEqual([]);
    expect(categories.find).not.toHaveBeenCalled();
  });

  it('resolves the category names once for the page, not once per row', async () => {
    tableQuery.mockResolvedValue({
      docs: [
        profile({ super_category_id: 'c-1', category_id: 'c-2', sub_category_id: 'c-3' }),
        profile({ _id: 'p-2', super_category_id: 'c-1' }),
      ],
      total: 2,
      page: 1,
      page_size: 25,
    });
    categories.find.mockReturnValue(
      chain([
        { _id: 'c-1', name: 'Sports' },
        { _id: 'c-2', name: 'Racquet' },
        { _id: 'c-3', name: 'Badminton' },
      ])
    );

    const { rows } = await clubAdminProfileService.table();

    expect(categories.find).toHaveBeenCalledTimes(1);
    expect(rows[0]).toMatchObject({ super_category: 'Sports', category: 'Racquet', sub_category: 'Badminton' });
    expect(rows[1]?.category).toBeNull();
  });

  it('lists the clubs each admin is on, read from the clubs themselves', async () => {
    tableQuery.mockResolvedValue({ docs: [profile()], total: 1, page: 1, page_size: 25 });
    clubs.find.mockReturnValue(
      chain([{ _id: CLUB_A, club_name: 'Sunset Club', admin_user_ids: [USER_ID] }])
    );

    const { rows } = await clubAdminProfileService.table();

    expect(rows[0]?.assigned_clubs).toEqual([{ id: CLUB_A, club_name: 'Sunset Club' }]);
  });

  it('lists no clubs for an admin who is on none', async () => {
    tableQuery.mockResolvedValue({ docs: [profile()], total: 1, page: 1, page_size: 25 });

    expect((await clubAdminProfileService.table()).rows[0]?.assigned_clubs).toEqual([]);
  });
});

describe('byId', () => {
  // `clubAdminProfile(id: ID!): ClubAdminProfile` is a NULLABLE field, so an id
  // that names nothing answers null rather than erroring the whole query.
  it('answers null for an id that names nothing', async () => {
    profiles.findById.mockResolvedValue(null);

    await expect(clubAdminProfileService.byId(ID)).resolves.toBeNull();
  });

  it('answers with the enriched record', async () => {
    profiles.findById.mockResolvedValue(profile());

    await expect(clubAdminProfileService.byId(ID)).resolves.toMatchObject({ full_name: 'Meera N' });
  });
});

describe('approve', () => {
  it('marks them approved, active, and dates the moment', async () => {
    const doc = profile();
    profiles.findById.mockResolvedValue(doc);

    await clubAdminProfileService.approve(ID);

    expect(doc.status).toBe('APPROVED');
    expect(doc.is_active).toBe(true);
    expect(doc.approved_at).toBeInstanceOf(Date);
    expect(doc.save).toHaveBeenCalled();
  });

  it('dates their joining from the approval, but never re-dates an existing one', async () => {
    const joined = new Date('2026-01-01T00:00:00.000Z');
    const doc = profile({ joined_at: joined });
    profiles.findById.mockResolvedValue(doc);

    await clubAdminProfileService.approve(ID);

    expect(doc.joined_at).toBe(joined);
  });

  it('keeps the reviewer note when one was written, and leaves it alone when not', async () => {
    const withNote = profile();
    profiles.findById.mockResolvedValue(withNote);
    await clubAdminProfileService.approve(ID, 'Verified on the call');
    expect(withNote.reviewer_notes).toBe('Verified on the call');

    const without = profile({ reviewer_notes: 'earlier note' });
    profiles.findById.mockResolvedValue(without);
    await clubAdminProfileService.approve(ID);
    expect(without.reviewer_notes).toBe('earlier note');
  });

  it('refuses to approve a record that does not exist', async () => {
    profiles.findById.mockResolvedValue(null);

    await expect(clubAdminProfileService.approve(ID)).rejects.toThrow('Club Admin not found');
  });
});

describe('reject', () => {
  it('needs a reason — a rejection with no note is not a decision anyone can read', async () => {
    await expect(clubAdminProfileService.reject(ID, '   ')).rejects.toThrow('A reason is required');
    expect(profiles.findById).not.toHaveBeenCalled();
  });

  it('records the decision rather than leaving it looking un-reviewed', async () => {
    const doc = profile();
    profiles.findById.mockResolvedValue(doc);

    await clubAdminProfileService.reject(ID, 'Could not verify the club');

    expect(doc.status).toBe('REJECTED');
    expect(doc.is_active).toBe(false);
    expect(doc.reviewer_notes).toBe('Could not verify the club');
  });
});

describe('setCommission', () => {
  it.each([[-1], [101]])('refuses %i percent', async (pct) => {
    await expect(clubAdminProfileService.setCommission(ID, pct)).rejects.toThrow(
      'Commission must be between 0 and 100'
    );
  });

  it('accepts the whole legal range, and null for "not set"', async () => {
    for (const pct of [0, 50, 100, null]) {
      const doc = profile();
      profiles.findById.mockResolvedValue(doc);

      await clubAdminProfileService.setCommission(ID, pct);

      expect(doc.commission_pct).toBe(pct);
    }
  });
});

describe('setActive', () => {
  it('tells the person when they are suspended', async () => {
    const doc = profile({ is_active: true });
    profiles.findById.mockResolvedValue(doc);

    await clubAdminProfileService.setActive(ID, false);

    expect(doc.is_active).toBe(false);
    expect(whatsapp.send).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'CLUB_ADMIN_ACCOUNT_SUSPENDED', name: 'Meera N' })
    );
  });

  it('tells them when they are brought back', async () => {
    const doc = profile({ is_active: false });
    profiles.findById.mockResolvedValue(doc);

    await clubAdminProfileService.setActive(ID, true);

    expect(whatsapp.send).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'CLUB_ADMIN_ACCOUNT_REACTIVATED' })
    );
  });

  it('says nothing when nothing changed — the second press must not be a second billed message', async () => {
    const doc = profile({ is_active: true });
    profiles.findById.mockResolvedValue(doc);

    await clubAdminProfileService.setActive(ID, true);

    expect(whatsapp.send).not.toHaveBeenCalled();
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('reads the number off the ACCOUNT, never off the onboarding record', async () => {
    const doc = profile({ is_active: false });
    profiles.findById.mockResolvedValue(doc);

    await clubAdminProfileService.setActive(ID, true);

    expect(users.findById).toHaveBeenCalledWith(doc.user_id);
  });
});

describe('remove', () => {
  it('is false for a record that is already gone', async () => {
    profiles.findById.mockResolvedValue(null);

    await expect(clubAdminProfileService.remove(ID)).resolves.toBe(false);
    expect(clubs.updateMany).not.toHaveBeenCalled();
  });

  it('unassigns them from every club, so no club is left with an admin who is not there', async () => {
    const doc = profile();
    profiles.findById.mockResolvedValue(doc);
    profiles.deleteOne.mockResolvedValue({});

    await clubAdminProfileService.remove(ID);

    expect(clubs.updateMany).toHaveBeenCalledWith(
      { admin_user_ids: doc.user_id },
      { $pull: { admin_user_ids: doc.user_id } }
    );
    expect(profiles.deleteOne).toHaveBeenCalled();
  });
});

describe('assignClubs', () => {
  it('pulls them off every club they are no longer on, and adds the ones they are', async () => {
    const doc = profile();
    profiles.findById.mockResolvedValue(doc);

    await clubAdminProfileService.assignClubs(ID, [CLUB_A, CLUB_B]);

    const [remove, add] = clubs.updateMany.mock.calls;
    expect(remove?.[1]).toEqual({ $pull: { admin_user_ids: doc.user_id } });
    expect(add?.[1]).toEqual({ $addToSet: { admin_user_ids: doc.user_id } });
  });

  it('unassigns everything when the list is emptied, without a pointless add', async () => {
    profiles.findById.mockResolvedValue(profile());

    await clubAdminProfileService.assignClubs(ID, []);

    expect(clubs.updateMany).toHaveBeenCalledTimes(1);
  });

  it('ignores an id that is not one rather than failing the whole assignment', async () => {
    profiles.findById.mockResolvedValue(profile());

    await clubAdminProfileService.assignClubs(ID, [CLUB_A, 'not-an-id']);

    const [, add] = clubs.updateMany.mock.calls;
    expect((add?.[0] as { _id: { $in: unknown[] } })._id.$in).toHaveLength(1);
  });

  it('refuses for a record that does not exist', async () => {
    profiles.findById.mockResolvedValue(null);

    await expect(clubAdminProfileService.assignClubs(ID, [])).rejects.toThrow('Club Admin not found');
  });
});
