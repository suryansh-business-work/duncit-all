import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { occasionService } from './occasion.service';
import type { OccasionLiveMode } from './occasion.types';

/** Same gate as the rest of the marketing console. */
const ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

type Ctx = GraphQLContext;
type Args = Record<string, unknown>;

const iso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null);

/** Marketing-only resolver: the role check runs before the service is touched. */
const marketing =
  <A extends Args>(run: (args: A, userId: string) => unknown) =>
  (_p: unknown, args: A, ctx: Ctx) => {
    const user = requireRole(ctx, ROLES);
    return run(args, user.id);
  };

export const occasionResolvers = {
  Query: {
    // Public on purpose: every app paints its look before anyone signs in.
    occasionLive: (_p: unknown, args: { preview?: string | null }) => occasionService.live(args.preview),
    occasionThemes: marketing((a: { include_archived?: boolean | null }) => occasionService.list(a.include_archived === true)),
    occasionTheme: marketing((a: { key: string }) => occasionService.get(a.key)),
    occasionSettings: marketing(() => occasionService.settings()),
  },
  Mutation: {
    saveOccasionTheme: marketing((a: { key?: string | null; input: Args }) => occasionService.save(a.key ?? null, a.input)),
    duplicateOccasionTheme: marketing((a: { key: string; name: string }) => occasionService.duplicate(a.key, a.name)),
    resetOccasionTheme: marketing((a: { key: string }) => occasionService.reset(a.key)),
    archiveOccasionTheme: marketing((a: { key: string; archived: boolean }) => occasionService.setArchived(a.key, a.archived)),
    deleteOccasionTheme: marketing((a: { key: string }) => occasionService.remove(a.key)),
    setOccasionSchedule: marketing((a: { key: string; input: Args }) => occasionService.setSchedule(a.key, a.input)),
    setOccasionLive: marketing((a: { input: { mode: OccasionLiveMode; manual_key?: string | null } }, userId) =>
      occasionService.setLive(a.input, userId)
    ),
  },
  OccasionTheme: {
    starts_at: (t: { starts_at?: Date | null }) => iso(t.starts_at),
    ends_at: (t: { ends_at?: Date | null }) => iso(t.ends_at),
    updated_at: (t: { updated_at?: Date | null }) => iso(t.updated_at),
  },
  OccasionLive: {
    next_change_at: (l: { next_change_at?: Date | null }) => iso(l.next_change_at),
  },
  OccasionSettings: {
    updated_at: (s: { updated_at?: Date | null }) => iso(s.updated_at),
  },
};
