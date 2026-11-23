import type { GraphQLContext } from '@context';
import { atLeast, requireIntel } from '../access/intel.access';
import { intelApprovalService } from '../approvals/intelApproval.service';
import { writeAudit } from '../audit/intelAudit.service';
import { allowedSources } from '../chat/intel.context';
import { intelTurns } from '../chat/intel.stream';
import { startTurn, type SendInput } from '../chat/intel.turn';
import { intelConversations, type ConversationSort, type ConversationView } from '../chat/intelConversation.service';
import { sourceCards } from '../health/intel.health';
import type { MediaVisibility } from '../intel.constants';
import { intelMediaService, type MediaView } from '../media/intelMedia.service';
import { intelSettingsService } from '../settings/intelSettings.service';
import { intelAdminResolvers } from './intelAdmin.resolver';
import { dateFields } from './intel.dates';

/**
 * The Intel API every signed-in Intel user has: bootstrap, their own chats,
 * files and approval requests. Thin by design — authorization here, the rules
 * in the services, which scope every read by the caller.
 */

type Args<T> = T;

const userQueries = {
  intelBootstrap: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    const actor = requireIntel(ctx);
    const settings = await intelSettingsService.get();
    const policy = intelSettingsService.policyFor(settings, actor.level);
    const [sources, pending] = await Promise.all([sourceCards(actor), intelApprovalService.pendingCount(actor)]);
    return {
      me: {
        user_id: actor.user.id,
        level: actor.level,
        can_admin: atLeast(actor.level, 'ADMIN'),
        can_super: actor.level === 'SUPER_ADMIN',
        environments: policy.environments,
        sources: allowedSources([], policy),
        can_request_writes: policy.can_request_writes,
      },
      app_title: settings.general.app_title,
      description: settings.general.description,
      default_environment: settings.general.default_environment,
      default_model: intelSettingsService.defaultModel(settings),
      models: intelSettingsService.enabledModels(settings),
      sources,
      pending_approvals: pending,
      upload_max_mb: settings.media.max_file_mb,
      upload_types: settings.media.allowed_types,
    };
  },
  intelConversations: (_: unknown, args: Args<{ view?: ConversationView; sort?: ConversationSort; search?: string; page?: number; page_size?: number }>, ctx: GraphQLContext) =>
    intelConversations.list(requireIntel(ctx).user.id, args),
  intelConversationCounts: (_: unknown, __: unknown, ctx: GraphQLContext) => intelConversations.counts(requireIntel(ctx).user.id),
  intelConversation: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelConversations.get(requireIntel(ctx).user.id, args.id),
  intelMessages: (_: unknown, args: { conversation_id: string }, ctx: GraphQLContext) => intelConversations.messages(requireIntel(ctx).user.id, args.conversation_id),
  intelMedia: (_: unknown, args: Args<{ view?: MediaView; folder?: string; search?: string; page?: number; page_size?: number }>, ctx: GraphQLContext) => intelMediaService.list(requireIntel(ctx), args),
  intelMediaFile: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelMediaService.get(requireIntel(ctx), args.id),
  intelMediaFolders: (_: unknown, __: unknown, ctx: GraphQLContext) => intelMediaService.folders(requireIntel(ctx)),
  intelApprovals: (_: unknown, args: { status?: string; mine?: boolean; limit?: number }, ctx: GraphQLContext) => intelApprovalService.list(requireIntel(ctx), args),
  intelApproval: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelApprovalService.get(requireIntel(ctx), args.id),
};

const userMutations = {
  /** Called once when the console opens: the login audit trail for Intel. */
  intelSessionStart: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
    const actor = requireIntel(ctx);
    await writeAudit({ type: 'SESSION', action: 'session.start', userId: actor.user.id, level: actor.level, ip: ctx.req.ip ?? '', detail: String(ctx.req.get('user-agent') ?? '').slice(0, 300) });
    return true;
  },
  intelSend: (_: unknown, args: { input: SendInput }, ctx: GraphQLContext) => startTurn(requireIntel(ctx), args.input),
  intelStop: (_: unknown, args: { message_id: string }, ctx: GraphQLContext) => intelTurns.stop(args.message_id, requireIntel(ctx).user.id),
  intelUpdateConversation: (_: unknown, args: { id: string; patch: Parameters<typeof intelConversations.update>[2] }, ctx: GraphQLContext) =>
    intelConversations.update(requireIntel(ctx).user.id, args.id, args.patch),
  intelDeleteConversation: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelConversations.remove(requireIntel(ctx).user.id, args.id),
  intelUpdateMedia: (_: unknown, args: { id: string; patch: { name?: string; folder?: string; visibility?: MediaVisibility; favorite?: boolean } }, ctx: GraphQLContext) =>
    intelMediaService.update(requireIntel(ctx), args.id, args.patch),
  intelArchiveMedia: (_: unknown, args: { id: string; archived: boolean }, ctx: GraphQLContext) => intelMediaService.archive(requireIntel(ctx), args.id, args.archived),
  intelTrashMedia: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelMediaService.trash(requireIntel(ctx), args.id),
  intelRestoreMedia: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelMediaService.restore(requireIntel(ctx), args.id),
  intelPurgeMedia: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelMediaService.purge(requireIntel(ctx), args.id),
  intelReindexMedia: (_: unknown, args: { id: string }, ctx: GraphQLContext) => intelMediaService.reindex(requireIntel(ctx), args.id),
  intelCreateFolder: (_: unknown, args: { path: string }, ctx: GraphQLContext) => intelMediaService.createFolder(requireIntel(ctx), args.path),
  intelDecideApproval: (_: unknown, args: { id: string; approve: boolean; note?: string | null }, ctx: GraphQLContext) =>
    intelApprovalService.decide(requireIntel(ctx), args.id, args.approve, args.note ?? ''),
};

export const intelResolvers = {
  Query: { ...userQueries, ...intelAdminResolvers.Query },
  Mutation: { ...userMutations, ...intelAdminResolvers.Mutation },
  IntelSourceCard: dateFields('last_sync_at'),
  IntelConversation: dateFields('last_message_at', 'created_at', 'updated_at'),
  IntelMessage: dateFields('created_at'),
  IntelConnector: dateFields('last_sync_at', 'last_success_at', 'created_at', 'updated_at'),
  IntelSyncRun: dateFields('started_at', 'finished_at', 'created_at'),
  IntelMedia: dateFields('indexed_at', 'created_at', 'updated_at'),
  IntelApproval: dateFields('decided_at', 'expires_at', 'created_at'),
  IntelAuditRow: dateFields('created_at'),
  IntelIndexDocument: dateFields('indexed_at'),
};
