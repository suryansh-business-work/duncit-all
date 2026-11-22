/**
 * Undo, wherever an exact inverse exists. Keyed by the GraphQL field a tool
 * runs, mapped to the field that reverses it and the arguments it takes, both
 * derived from the original call's own arguments — so an undo can never act on
 * anything the original did not.
 *
 * Only true inverses are listed. An edit (a profile update, a locale change)
 * has no inverse without the value it overwrote, so it is not offered here.
 */

export interface RollbackPlan {
  field: string;
  args: Record<string, unknown>;
}

interface RollbackRule {
  inverse: string;
  /** Argument names copied from the original call. */
  keys: readonly string[];
}

const RULES: Readonly<Record<string, RollbackRule>> = {
  followPod: { inverse: 'unfollowPod', keys: ['pod_id'] },
  unfollowPod: { inverse: 'followPod', keys: ['pod_id'] },
  followClub: { inverse: 'unfollowClub', keys: ['club_id'] },
  unfollowClub: { inverse: 'followClub', keys: ['club_id'] },
  followUser: { inverse: 'unfollowUser', keys: ['user_id'] },
  unfollowUser: { inverse: 'followUser', keys: ['user_id'] },
  blockUser: { inverse: 'unblockUser', keys: ['user_id'] },
};

export const ROLLBACK_FIELDS: readonly string[] = Object.keys(RULES);

/** How to undo a call of `field` with `args`, or null when there is no exact inverse. */
export function rollbackPlanFor(field: string, args: Record<string, unknown>): RollbackPlan | null {
  const rule = RULES[field];
  if (!rule) return null;
  const inverseArgs: Record<string, unknown> = {};
  for (const key of rule.keys) {
    const value = args[key];
    if (typeof value !== 'string' || !value) return null;
    inverseArgs[key] = value;
  }
  return { field: rule.inverse, args: inverseArgs };
}
