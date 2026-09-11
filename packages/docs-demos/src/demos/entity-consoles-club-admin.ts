import { clubAdminToValues, valuesToClubAdminInput } from '@duncit/entity-consoles';
import { defineDemo } from '../types';

/**
 * The club-admin editor's mapping demo.
 *
 * What it is really showing is the ACCESS split: the same form values produce a
 * different payload depending on whether the person saving may govern, and that
 * is the part a reader has to get right.
 */

/** A stored Club Admin record as `clubAdminProfile(id:)` answers it. */
type ClubAdminRecordMock = Parameters<typeof clubAdminToValues>[0];

const ADMIN: ClubAdminRecordMock = {
  id: '66f3c4d5e6f708192a3b4c5d',
  club_admin_no: 'CADM-000042',
  user_id: '66d2d3e4f5a6b7c8d9e0f1a2',
  full_name: 'Kabir Sethi',
  email: 'kabir.sethi@example.com',
  phone: '9711203344',
  super_category: 'Social',
  category: 'Board Games',
  sub_category: 'Catan Night',
  super_category_id: '66a0000000000000000000a1',
  category_id: '66a0000000000000000000b2',
  sub_category_id: '66a0000000000000000000c3',
  status: 'APPROVED',
  is_active: true,
  commission_pct: 15,
  joined_at: '2026-01-19T05:30:00.000Z',
  reviewer_notes: 'Ran the Hauz Khas pilot; keeps his roster full.',
  request_no: 'MEET-000455',
  created_at: '2026-01-17T12:00:00.000Z',
  assigned_clubs: [
    { id: '66c0000000000000000000e1', club_name: 'Delhi Board Gamers' },
    { id: '66c0000000000000000000e2', club_name: 'Gurgaon Catan Club' },
  ],
};

const NOTE =
  'Flip canGovern to false — the same record, saved by somebody holding only ' +
  'ALL_CLUB_ADMINS_ACCESS. commission_pct disappears from the payload, because the ' +
  'details mutation carries it and is not gated on it: sending an unchanged copy ' +
  'would still be writing a money field through a door that does not check. The ' +
  'clubs are assigned either way — which clubs somebody runs is an edit, not an ' +
  'approval.';

interface ClubAdminMock {
  record: ClubAdminRecordMock;
  canGovern: boolean;
}

export const clubAdminEditorMappingDemo = defineDemo<ClubAdminMock>({
  id: 'club-admin-editor-mapping',
  title: 'The same save, with and without governance',
  note: NOTE,
  mock: { record: ADMIN, canGovern: true },
  compute: (mock) => {
    const values = clubAdminToValues(mock.record);
    const input = valuesToClubAdminInput(values, mock.canGovern);
    const category = [values.category.super_name, values.category.category_name, values.category.sub_name]
      .filter(Boolean)
      .join(' › ');
    return {
      'Form shows (identity)': `${values.full_name} · ${values.email} · ${values.phone || 'no phone'}`,
      'Form shows (category)': category,
      'Form shows (clubs)': mock.record.assigned_clubs.map((club) => club.club_name).join(', '),
      'updateClubAdminProfile input keys': Object.keys(input).join(', '),
      'commission_pct included': 'commission_pct' in input ? 'yes' : 'no — needs governance',
      'assignClubAdminClubs sends': `${values.club_ids.length} club id(s), replacing the whole set`,
      'The decision': mock.canGovern
        ? 'approve/reject run only if the status actually moved'
        : 'not sent — approving is governance',
    };
  },
});
