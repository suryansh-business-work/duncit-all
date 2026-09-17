import { Types } from 'mongoose';
import { ClubModel } from '@modules/clubs/club/club.model';
import { ClubAdminProfileModel } from '@modules/clubs/clubAdminProfile/clubAdminProfile.model';
import type { HeldPod } from './held-pods';

/**
 * Who the club admins are, and which clubs each one runs.
 *
 * A club admin is anyone a club names in `admin_user_ids` plus every approved,
 * active Club Admin record — the assignment is the permission, and some admins
 * predate the record.
 */

export interface ProfileRow {
  user_id: Types.ObjectId;
  full_name?: string;
  club_admin_no?: string | null;
  status: string;
  is_active?: boolean;
  category_id?: Types.ObjectId | null;
  created_at: Date;
  approved_at?: Date | null;
}

export interface AdminClubRow {
  _id: Types.ObjectId;
  is_active?: boolean;
  location_id?: Types.ObjectId | null;
  admin_user_ids?: Types.ObjectId[];
}

export interface AdminDirectory {
  profiles: ProfileRow[];
  clubs: AdminClubRow[];
  /** Every club admin's user id → the clubs they run. */
  clubsByAdmin: Map<string, string[]>;
  /** Every club id → the user ids that administer it. */
  adminsByClub: Map<string, string[]>;
}

export async function loadDirectory(): Promise<AdminDirectory> {
  const [profiles, clubs] = await Promise.all([
    ClubAdminProfileModel.find({})
      .select('user_id full_name club_admin_no status is_active category_id created_at approved_at')
      .lean<ProfileRow[]>(),
    ClubModel.find({}).select('is_active location_id admin_user_ids').lean<AdminClubRow[]>(),
  ]);
  const clubsByAdmin = new Map<string, string[]>();
  for (const profile of profiles) {
    if (profile.status === 'APPROVED' && profile.is_active !== false) {
      clubsByAdmin.set(profile.user_id.toHexString(), []);
    }
  }
  const adminsByClub = new Map<string, string[]>();
  for (const club of clubs) {
    const clubId = club._id.toHexString();
    const adminIds = (club.admin_user_ids ?? []).map((id) => id.toHexString());
    adminsByClub.set(clubId, adminIds);
    for (const adminId of adminIds) {
      clubsByAdmin.set(adminId, [...(clubsByAdmin.get(adminId) ?? []), clubId]);
    }
  }
  return { profiles, clubs, clubsByAdmin, adminsByClub };
}

/** The admins answerable for a held pod — the admins of its club. */
export const adminsOfPod = (directory: AdminDirectory) => (pod: HeldPod) =>
  directory.adminsByClub.get(pod.club_id) ?? [];
