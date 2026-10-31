import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { SocialPlatform } from '@modules/crm/marketing/social/social.types';
import type { ReelAspect } from './reel.edit';
import type { ReelAssetKind } from './reel.model';
import {
  reelService,
  type ReelActor,
  type ReelConceptInput,
  type ReelMessageInput,
  type ReelProjectInput,
  type ReelScriptInput,
  type ReelStockAssetInput,
  type ReelUploadInput,
} from './reel.service';

/**
 * Reel Studio lives in the Marketing console, where a finished reel is posted
 * from; the AI console keeps its access because the director and its prompts
 * are tuned there. Every field here is also an MCP tool (the gateway derives
 * them from the schema), so the gates are the same whoever calls.
 */
const REEL_ROLES = ['SUPER_ADMIN', 'MARKETING_MANAGER', 'MARKETING_EDITOR', 'AI_MANAGER'];

function actorOf(ctx: GraphQLContext): ReelActor {
  const user = requireRole(ctx, REEL_ROLES);
  return { id: user.id, email: user.email ?? '' };
}

type ProjectArgs = { project_id: string };

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
    reelMediaSearch: (
      _p: unknown,
      args: { query: string; kind: ReelAssetKind; orientation?: ReelAspect | null; page?: number | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, REEL_ROLES);
      return reelService.mediaSearch(args);
    },
    validateReel: (_p: unknown, args: ProjectArgs & { platforms: SocialPlatform[] }, ctx: GraphQLContext) => {
      requireRole(ctx, REEL_ROLES);
      return reelService.validate(args.project_id, args.platforms);
    },
    reelAnalytics: (_p: unknown, args: ProjectArgs, ctx: GraphQLContext) => {
      requireRole(ctx, REEL_ROLES);
      return reelService.analytics(args.project_id);
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
    addReelDriveAssets: (_p: unknown, args: ProjectArgs & { file_ids: string[] }, ctx: GraphQLContext) =>
      reelService.addDriveAssets(args.project_id, args.file_ids, actorOf(ctx)),
    addReelStockAssets: (_p: unknown, args: ProjectArgs & { items: ReelStockAssetInput[] }, ctx: GraphQLContext) =>
      reelService.addStockAssets(args.project_id, args.items, actorOf(ctx)),
    addReelUploadAssets: (_p: unknown, args: ProjectArgs & { uploads: ReelUploadInput[] }, ctx: GraphQLContext) =>
      reelService.addUploadAssets(args.project_id, args.uploads, actorOf(ctx)),
    removeReelAsset: (_p: unknown, args: ProjectArgs & { asset_id: string }, ctx: GraphQLContext) =>
      reelService.removeAsset(args.project_id, args.asset_id, actorOf(ctx)),
    sendReelMessage: (_p: unknown, args: { input: ReelMessageInput }, ctx: GraphQLContext) =>
      reelService.sendMessage(args.input, actorOf(ctx)),
    restoreReelVersion: (_p: unknown, args: ProjectArgs & { message_id: string }, ctx: GraphQLContext) =>
      reelService.restoreVersion(args.project_id, args.message_id, actorOf(ctx)),
    saveReelSpec: (_p: unknown, args: ProjectArgs & { spec_json: string }, ctx: GraphQLContext) =>
      reelService.saveSpec(args.project_id, args.spec_json, actorOf(ctx)),
    generateReelIdeas: (_p: unknown, args: ProjectArgs & { brief: string; count?: number | null }, ctx: GraphQLContext) =>
      reelService.generateIdeas(args.project_id, args.brief, args.count, actorOf(ctx)),
    generateReelScript: (
      _p: unknown,
      args: ProjectArgs & { concept: ReelConceptInput; length_s: number; tone?: string | null },
      ctx: GraphQLContext
    ) => reelService.generateScript(args.project_id, args.concept, args.length_s, args.tone, actorOf(ctx)),
    applyReelStoryboard: (_p: unknown, args: ProjectArgs & { script: ReelScriptInput; auto_media?: boolean | null }, ctx: GraphQLContext) =>
      reelService.applyStoryboard(args.project_id, args.script, args.auto_media, actorOf(ctx)),
    generateReelVoiceover: (
      _p: unknown,
      args: ProjectArgs & { text: string; voice?: string | null; language?: string | null },
      ctx: GraphQLContext
    ) => reelService.generateVoiceover(args.project_id, args.text, args.voice, args.language, actorOf(ctx)),
    generateReelSubtitles: (_p: unknown, args: ProjectArgs & { asset_id: string; language?: string | null }, ctx: GraphQLContext) =>
      reelService.generateSubtitles(args.project_id, args.asset_id, args.language, actorOf(ctx)),
    generateReelVariants: (_p: unknown, args: ProjectArgs & { platforms: SocialPlatform[] }, ctx: GraphQLContext) =>
      reelService.generateVariants(args.project_id, args.platforms, actorOf(ctx)),
    setReelCover: (_p: unknown, args: ProjectArgs & { at_ms: number }, ctx: GraphQLContext) =>
      reelService.setCover(args.project_id, args.at_ms, actorOf(ctx)),
    recommendNextReel: (_p: unknown, args: ProjectArgs, ctx: GraphQLContext) =>
      reelService.recommendNext(args.project_id, actorOf(ctx)),
  },
};
