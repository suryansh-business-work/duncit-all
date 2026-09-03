import { localizationService } from "./localization.service";
import { autoTranslateService } from "./autoTranslate.service";
import type { GraphQLContext } from "@context";
import { requireRole } from "@middleware/rbac";
import type { TableQueryInput } from "@utils/table-query";
import { EMAIL_FALLBACK } from "@services/email/email-i18n";

const ADMIN_READ = ["SUPER_ADMIN", "CITY_ADMIN", "ZONAL_ADMIN", "SUPPORT_USER", "TECH_MANAGER"];
const ADMIN_WRITE = ["SUPER_ADMIN", "TECH_MANAGER"];

export const localizationResolvers = {
  Query: {
    locales: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return localizationService.listLocales();
    },
    // Unauthenticated on purpose: the language switcher and the first render of
    // every surface (including the login screen and the Astro sites) need it.
    publicLocales: async () => localizationService.listPublicLocales(),
    publicTranslations: async (_p: unknown, args: { locale: string }) =>
      localizationService.publicTranslations(args.locale),
    translationsTable: async (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ADMIN_READ);
      return localizationService.translationsTable(args.query);
    },
    translationGroups: async (
      _p: unknown,
      args: { query?: TableQueryInput | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ADMIN_READ);
      return localizationService.translationGroups(args.query);
    },
    serverTranslationSeed: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return Object.entries(EMAIL_FALLBACK).map(([key, value]) => ({ key, value }));
    },
    localeCoverage: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return autoTranslateService.coverage();
    },
    autoTranslatePending: async (
      _p: unknown,
      args: { locale: string; replace_existing?: boolean | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ADMIN_READ);
      return autoTranslateService.pendingCount(args.locale, args.replace_existing === true);
    },
    autoTranslateJob: async (_p: unknown, args: { locale: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return autoTranslateService.latestJob(args.locale);
    },
    autoTranslateJobs: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return autoTranslateService.recentJobs();
    },
  },
  Mutation: {
    upsertLocale: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return localizationService.upsertLocale(args.input);
    },
    deleteLocale: async (_p: unknown, args: { code: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return localizationService.deleteLocale(args.code);
    },
    upsertTranslation: async (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return localizationService.upsertTranslation(args.input);
    },
    deleteTranslation: async (_p: unknown, args: { key: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return localizationService.deleteTranslation(args.key);
    },
    importTranslationKeys: async (
      _p: unknown,
      args: { locale: string; entries: { key: string; value: string }[] },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return localizationService.importTranslationKeys(args.locale, args.entries);
    },
    startAutoTranslate: async (
      _p: unknown,
      args: { locale: string; replace_existing?: boolean | null },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ADMIN_WRITE);
      return autoTranslateService.start({
        locale: args.locale,
        replace_existing: args.replace_existing,
        userId: ctx.user?.id ?? null,
      });
    },
    cancelAutoTranslate: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_WRITE);
      return autoTranslateService.cancel(args.id);
    },
  },
};
