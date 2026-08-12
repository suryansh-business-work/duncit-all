import { Types } from 'mongoose';
import { UserModel } from './user.model';
import { UserRoleModel } from './relations';

/**
 * Every role a user actually holds, resolved the way the rest of the platform
 * reports it.
 *
 * `user_roles` is the authoritative store and `metadata.role_keys` is a
 * denormalized cache of it (user.model.ts). `toPublic()` — and therefore the
 * `me { roles }` query every console gates its UI on — reads the relation
 * first and only falls back to the cache. An authorization check that reads
 * the cache directly is answering a DIFFERENT question than the one the UI
 * asked: once the two drift, the buttons render enabled and the mutation
 * behind them returns FORBIDDEN, which is unreportable from the client.
 *
 * Read through here for any gate. Querying users BY role (a filter, an
 * audience, a staff roster) still uses the indexed cache — that is what it is
 * for; it is only authorization that must not disagree with `me`.
 */
export async function effectiveRoleKeys(userId: string): Promise<string[]> {
  if (!Types.ObjectId.isValid(userId)) return [];
  const oid = new Types.ObjectId(userId);
  const [rows, doc] = await Promise.all([
    UserRoleModel.find({ user_id: oid }).select('role').lean(),
    UserModel.findById(oid).select('metadata.role_keys').lean(),
  ]);
  const authoritative = rows.map((row: any) => String(row.role)).filter(Boolean);
  // Same precedence as toPublic(): relations win, the cache answers only for a
  // user with no relation rows yet (pre-migration accounts).
  if (authoritative.length > 0) return Array.from(new Set(authoritative));
  return ((doc as any)?.metadata?.role_keys ?? []) as string[];
}

/** `effectiveRoleKeys` for one role — the shape most gates want. */
export async function userHasRole(userId: string, role: string): Promise<boolean> {
  const roles = await effectiveRoleKeys(userId);
  return roles.includes(role);
}
