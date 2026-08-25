import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { shellStateService } from './shellState.service';

/**
 * Every signed-in console user, not a role list: the taskbar and the Agent tab
 * are part of the chrome everybody sees, so gating them on a role would leave
 * some readers unable to save where they dragged their own launcher.
 */
export const shellStateResolvers = {
  Query: {
    shellWorkspaceState: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const me = requireAuth(ctx);
      return shellStateService.state(me.id);
    },
  },
  Mutation: {
    saveShellWorkspaceState: (
      _p: unknown,
      args: { input: Record<string, unknown> },
      ctx: GraphQLContext
    ) => {
      const me = requireAuth(ctx);
      return shellStateService.save(me.id, args.input ?? {});
    },
  },
};
