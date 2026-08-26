import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
// The same two rungs the rest of the Tech portal uses: TECH_MANAGER can read
// the queue, only SUPER_ADMIN can destroy anything. A purge is irreversible
// and reaches every collection a member appears in, so it sits at the top
// role alongside the web terminal and the data clone rather than beside a
// table nobody can break.
import { TECH_EXEC } from '@modules/platform/tech/tech.resolver';
import { accountDeletionService, type CronSettingsInput } from './accountDeletion.service';
import { accountDeletionCron } from './accountDeletion.cron';
import type { DeletionRequestSurface } from './accountDeletion.model';

const TECH_REVIEW = ['SUPER_ADMIN', 'TECH_MANAGER'];

/*
  The sweep is configured from the Admin Panel and read from both consoles.

  Reading is TECH_REVIEW, the same rung that already reads the queue itself —
  an operator who can see who asked to be deleted can see whether the job that
  removes them is alive. CHANGING it is SUPER_ADMIN alone: switching the
  schedule on hands irreversible deletions to a timer, and pressing Run now
  carries them out on the spot. Both sit beside the manual purge in
  TECH_EXEC rather than beside a setting somebody can undo.
*/
const CRON_ADMIN = ['SUPER_ADMIN'];

interface SubmitArgs {
  input: { otp: string; reason?: string | null; surface?: DeletionRequestSurface | null };
}

export const accountDeletionResolvers = {
  Query: {
    myAccountDeletionRequest: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return accountDeletionService.myRequest(user.id);
    },
    accountDeletionSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return accountDeletionService.settings();
    },
    accountDeletionRequestsTable: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_REVIEW);
      return accountDeletionService.table(args.query);
    },
    accountDeletionRequest: (
      _p: unknown,
      args: { request_doc_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_REVIEW);
      return accountDeletionService.detail(args.request_doc_id);
    },
    accountDeletionCronSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_REVIEW);
      return accountDeletionService.adminSettings();
    },
    accountDeletionDueCount: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, TECH_REVIEW);
      return accountDeletionCron.dueCount();
    },
    accountDeletionRuns: (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, TECH_REVIEW);
      return accountDeletionCron.runsTable(args.query);
    },
  },
  Mutation: {
    submitAccountDeletionRequest: (_p: unknown, args: SubmitArgs, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return accountDeletionService.submitRequest(user.id, args.input);
    },
    cancelMyAccountDeletionRequest: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return accountDeletionService.cancelMyRequest(user.id);
    },
    purgeAccountTrace: (
      _p: unknown,
      args: { input: { request_doc_id: string; model_name: string; field_path: string } },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, TECH_EXEC);
      return accountDeletionService.purgeGroup(
        args.input.request_doc_id,
        { model_name: args.input.model_name, field_path: args.input.field_path },
        actor.id
      );
    },
    purgeAccountCompletely: (
      _p: unknown,
      args: { request_doc_id: string },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, TECH_EXEC);
      return accountDeletionService.purgeAll(args.request_doc_id, actor.id);
    },
    rejectAccountDeletionRequest: (
      _p: unknown,
      args: { request_doc_id: string; note: string },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, TECH_REVIEW);
      return accountDeletionService.reject(args.request_doc_id, args.note, actor.id);
    },
    updateAccountDeletionSettings: (
      _p: unknown,
      args: { retention_days: number },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, TECH_REVIEW);
      return accountDeletionService.updateSettings(args.retention_days, actor.id);
    },
    updateAccountDeletionCron: (
      _p: unknown,
      args: { input: CronSettingsInput },
      ctx: GraphQLContext
    ) => {
      const actor = requireRole(ctx, CRON_ADMIN);
      return accountDeletionService.updateCronSettings(args.input, actor.id);
    },
    runAccountDeletionPurgeNow: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const actor = requireRole(ctx, CRON_ADMIN);
      return accountDeletionCron.runNow(actor.id);
    },
  },
};
