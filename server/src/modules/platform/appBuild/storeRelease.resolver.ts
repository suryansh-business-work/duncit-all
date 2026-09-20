import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { ReleaseStore } from './storeRelease.model';
import {
  getStoreReleaseSettings,
  logRejection,
  pubIssue,
  pubSettings,
  resolveIssue,
  setReviewerMessage,
  storeReleases,
  submitLatestBuild,
  updateStoreReleaseSettings,
  type LogRejectionInput,
  type StoreReleaseSettingsInput,
} from './storeRelease.service';

// Releases are read with the same store credentials the pushes use, so the
// gate is the pushes' gate.
const RELEASES_MANAGE = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const storeReleaseResolvers = {
  Query: {
    storeReleases: (_p: unknown, args: { store: ReleaseStore }, ctx: GraphQLContext) => {
      requireRole(ctx, RELEASES_MANAGE);
      return storeReleases(args.store);
    },
    storeReleaseSettings: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RELEASES_MANAGE);
      return pubSettings(await getStoreReleaseSettings());
    },
  },
  Mutation: {
    updateStoreReleaseSettings: async (
      _p: unknown,
      args: { input: StoreReleaseSettingsInput },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RELEASES_MANAGE);
      return pubSettings(await updateStoreReleaseSettings(args.input, user.email ?? user.id));
    },
    logStoreRejection: async (_p: unknown, args: { input: LogRejectionInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RELEASES_MANAGE);
      return pubIssue(await logRejection(args.input, user));
    },
    setStoreIssueReviewerMessage: async (
      _p: unknown,
      args: { id: string; message: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RELEASES_MANAGE);
      return pubIssue(await setReviewerMessage(args.id, args.message, user));
    },
    resolveStoreIssue: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RELEASES_MANAGE);
      return pubIssue(await resolveIssue(args.id, user));
    },
    submitLatestBuildToStore: (_p: unknown, args: { store: ReleaseStore }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RELEASES_MANAGE);
      return submitLatestBuild(args.store, user);
    },
  },
};
