import { localizationService } from "./localization.service";
import { aiTranslateService, type AiTranslationInput } from "./aiTranslate.service";
import type { GraphQLContext } from "@context";
import { requireRole } from "@middleware/rbac";
import type { TableQueryInput } from "@utils/table-query";
import { EMAIL_FALLBACK } from "@services/email/email-i18n";

// The Localization console's own role, beside the platform admins who managed
// languages before it had one.
const ADMIN_READ = [
  "SUPER_ADMIN",
  "CITY_ADMIN",
  "ZONAL_ADMIN",
  "SUPPORT_USER",
  "TECH_MANAGER",
  "LOCALIZATION_MANAGER",
];
const ADMIN_WRITE = ["SUPER_ADMIN", "TECH_MANAGER", "LOCALIZATION_MANAGER"];

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
      return aiTranslateService.coverage();
    },
    aiTranslationPending: async (
      _p: unknown,
      args: { input: AiTranslationInput },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, ADMIN_READ);
      return aiTranslateService.pending(args.input);
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
    startAiTranslation: async (
      _p: unknown,
      args: { input: AiTranslationInput; url?: string | null },
      ctx: GraphQLContext,
    ) => aiTranslateService.start(requireRole(ctx, ADMIN_WRITE), args.input, args.url),
  },
};
