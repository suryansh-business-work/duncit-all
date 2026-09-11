import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import type { ClubAdminStatus } from '../queries';

/**
 * A Club Admin record, as one form.
 *
 * `club_ids` is not a field of the record: the clubs somebody runs have always
 * lived on `Club.admin_user_ids`, and a second copy here would be a second thing
 * to keep right. The form holds the set it is about to assign, and the save
 * writes it through `assignClubAdminClubs`.
 */
export interface ClubAdminFormValues {
  /** Empty while appointing; the record's doc id while editing. */
  id: string;
  /** The account this record belongs to. */
  user_id: string;

  full_name: string;
  email: string;
  phone: string;
  category: AdminCategoryValue;

  status: ClubAdminStatus;
  is_active: boolean;
  /** 0 inherits the platform default at settlement. */
  commission_pct: number;

  /** The clubs this admin runs, as club ids. */
  club_ids: string[];
}

export const blankClubAdminValues: ClubAdminFormValues = {
  id: '',
  user_id: '',
  full_name: '',
  email: '',
  phone: '',
  category: EMPTY_CATEGORY,
  status: 'DRAFT',
  is_active: true,
  commission_pct: 0,
  club_ids: [],
};
