import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';

/**
 * Who made a change, and from where — the two attributions every change log
 * stamps on every row.
 *
 * Both trails (the user change log and the entity change log) answer them the
 * same way, from the request currently in flight, so no call site has to pass
 * them and none can forget to. Consolidated here rather than into a package —
 * `server/src` imports no `@duncit/*` by design (rule 40).
 */

/** Which surface a change came from — the five the clients declare. */
export type AuditSource = 'NATIVE' | 'MWEB' | 'ADMIN_PORTAL' | 'PORTAL' | 'SERVER';

const DECLARED_SOURCES = new Set<AuditSource>([
  'NATIVE',
  'MWEB',
  'ADMIN_PORTAL',
  'PORTAL',
  'SERVER',
]);

/**
 * The surface, read from the header the caller declared and never guessed: a
 * value that is not one of the Duncit clients is SERVER, because that is
 * honestly what an unattributed write is.
 */
export function sourceFromDeclared(declared?: string | null): AuditSource {
  return DECLARED_SOURCES.has(declared as AuditSource) ? (declared as AuditSource) : 'SERVER';
}

/** The actor's display name, denormalized so a row survives their deletion. */
export async function auditActorName(actorId: string | null): Promise<string> {
  if (!actorId || !Types.ObjectId.isValid(actorId)) return '';
  const actor = await UserModel.findById(actorId)
    .select('profile.first_name profile.last_name auth.email')
    .lean();
  if (!actor) return '';
  const profile = (actor as { profile?: { first_name?: string; last_name?: string } }).profile;
  const name = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
  return name || (actor as { auth?: { email?: string } }).auth?.email || '';
}
