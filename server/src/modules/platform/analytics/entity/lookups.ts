import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { LocationModel } from '@modules/platform/location/location.model';
import { CategoryModel } from '@modules/pods/category/category.model';

/**
 * Id → display name, for the handful of ids a chart or a ranking names.
 * Each is one `$in` read, so a page costs a query per kind of name, never one
 * per row.
 */

const objectIds = (ids: Iterable<string>) =>
  [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

export async function userNames(ids: Iterable<string>): Promise<Map<string, string>> {
  const users = await UserModel.find({ _id: { $in: objectIds(ids) } })
    .select('profile.first_name profile.last_name email')
    .lean<Array<{ _id: Types.ObjectId; profile?: { first_name?: string; last_name?: string }; email?: string }>>();
  return new Map(
    users.map((user) => {
      const name = [user.profile?.first_name, user.profile?.last_name].filter(Boolean).join(' ').trim();
      return [user._id.toHexString(), name || user.email || ''];
    })
  );
}

/** A city's display name — the location's own name, which is what every console shows. */
export async function locationNames(ids: Iterable<string>): Promise<Map<string, string>> {
  const locations = await LocationModel.find({ _id: { $in: objectIds(ids) } })
    .select('location_name')
    .lean<Array<{ _id: Types.ObjectId; location_name: string }>>();
  return new Map(locations.map((location) => [location._id.toHexString(), location.location_name]));
}

export async function categoryNames(ids: Iterable<string>): Promise<Map<string, string>> {
  const categories = await CategoryModel.find({ _id: { $in: objectIds(ids) } })
    .select('name')
    .lean<Array<{ _id: Types.ObjectId; name: string }>>();
  return new Map(categories.map((category) => [category._id.toHexString(), category.name]));
}

/** The id a nullable ref is filed under — every missing ref shares one bucket. */
export function refKey(value?: string | Types.ObjectId | null): string {
  if (!value) return 'none';
  return typeof value === 'string' ? value : value.toHexString();
}
