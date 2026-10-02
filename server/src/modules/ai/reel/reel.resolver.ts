import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { reelService, type ReelActor, type ReelMessageInput, type ReelProjectInput } from './reel.service';

/** The AI portal owns Reel Studio. Nothing here is read by another console. */
const REEL_ROLES = ['SUPER_ADMIN', 'AI_MANAGER'];

function actorOf(ctx: GraphQLContext): ReelActor {
  const user = requireRole(ctx, REEL_ROLES);
  return { id: user.id, email: user.email ?? '' };
}

export const reelResolvers = {
  Query: {
    reelProjects: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, REEL_ROLES);
      return reelService.list();
    },
    reelProject: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, REEL_ROLES);
      return reelService.get(args.id);
    },
    reelDriveStatus: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, REEL_ROLES);
      return reelService.driveStatus();
    },
    reelDriveFolder: (_p: unknown, args: { folder: string }, ctx: GraphQLContext) => {
      requireRole(ctx, REEL_ROLES);
      return reelService.driveFolder(args.folder);
    },
  },
  Mutation: {
    createReelProject: (_p: unknown, args: { input: ReelProjectInput }, ctx: GraphQLContext) =>
      reelService.create(args.input, actorOf(ctx)),
    updateReelProject: (_p: unknown, args: { id: string; input: ReelProjectInput }, ctx: GraphQLContext) =>
      reelService.update(args.id, args.input, actorOf(ctx)),
    deleteReelProject: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, REEL_ROLES);
      return reelService.remove(args.id);
    },
    addReelDriveAssets: (_p: unknown, args: { project_id: string; file_ids: string[] }, ctx: GraphQLContext) =>
      reelService.addDriveAssets(args.project_id, args.file_ids, actorOf(ctx)),
    removeReelAsset: (_p: unknown, args: { project_id: string; asset_id: string }, ctx: GraphQLContext) =>
      reelService.removeAsset(args.project_id, args.asset_id, actorOf(ctx)),
    sendReelMessage: (_p: unknown, args: { input: ReelMessageInput }, ctx: GraphQLContext) =>
      reelService.sendMessage(args.input, actorOf(ctx)),
    restoreReelVersion: (_p: unknown, args: { project_id: string; message_id: string }, ctx: GraphQLContext) =>
      reelService.restoreVersion(args.project_id, args.message_id, actorOf(ctx)),
  },
};
