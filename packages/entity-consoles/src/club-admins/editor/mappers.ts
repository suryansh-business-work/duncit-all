import type { ClubAdminDetail } from '../queries';
import { blankClubAdminValues, type ClubAdminFormValues } from './types';

/** The stored record as form values. */
export function clubAdminToValues(admin: ClubAdminDetail): ClubAdminFormValues {
  return {
    id: admin.id,
    user_id: admin.user_id,
    full_name: admin.full_name ?? '',
    email: admin.email ?? '',
    phone: admin.phone ?? '',
    category: {
      super_id: admin.super_category_id ?? '',
      super_name: admin.super_category ?? '',
      category_id: admin.category_id ?? '',
      category_name: admin.category ?? '',
      sub_id: admin.sub_category_id ?? '',
      sub_name: admin.sub_category ?? '',
    },
    status: admin.status,
    is_active: admin.is_active,
    commission_pct: admin.commission_pct ?? blankClubAdminValues.commission_pct,
    club_ids: (admin.assigned_clubs ?? []).map((club) => club.id),
  };
}

/**
 * The details mutation's input.
 *
 * `commission_pct` is only included for a governor: the input carries it, so a
 * console-role editor sending their own (unchanged) copy would still be writing a
 * money field through a mutation that does not gate it. Omitting it leaves the
 * stored value exactly as it was.
 */
export const valuesToClubAdminInput = (values: ClubAdminFormValues, canGovern: boolean) => ({
  full_name: values.full_name,
  email: values.email,
  phone: values.phone,
  super_category_id: values.category.super_id || null,
  category_id: values.category.category_id || null,
  sub_category_id: values.category.sub_id || null,
  ...(canGovern ? { commission_pct: values.commission_pct || null } : {}),
});
