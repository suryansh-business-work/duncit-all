import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';
import {
  createCampaign,
  createTemplate,
  deleteTemplate,
} from '@modules/platform/aisensy/aisensy.project';
import { whatsappAdminService } from './whatsapp.admin';
import { whatsappPreferenceService } from './whatsapp.preference.service';

/**
 * Who may do what.
 *
 * The console is the same audience as the rest of the messaging tooling. The
 * per-person switches need only a signed-in account — they are that person's
 * own settings, and the service resolves the number from the account rather
 * than trusting anything the client sends.
 */
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

export const waAutomationResolvers = {
  Query: {
    whatsappScenarios: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return whatsappAdminService.scenarios();
    },
    whatsappMessageLog: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return whatsappAdminService.logById(args.id);
    },
    whatsappDefaultMedia: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return whatsappAdminService.defaultMedia();
    },
    myWhatsappPreference: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return whatsappPreferenceService.mine(user.id);
    },
  },

  Mutation: {
    setWhatsappScenarioEnabled: (
      _p: unknown,
      args: { event_key: string; enabled: boolean },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return whatsappAdminService.setEnabled(args.event_key, args.enabled, user.id);
    },
    reconcileWhatsappScenarios: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return whatsappAdminService.reconcile(user.id);
    },
    setWhatsappScenarioMedia: (
      _p: unknown,
      args: { event_key: string; url: string; filename?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, ADMIN_ROLES);
      return whatsappAdminService.setMedia(args.event_key, args.url, args.filename ?? '', user.id);
    },
    setMyWhatsappPreference: (
      _p: unknown,
      args: { category: string; enabled: boolean },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return whatsappPreferenceService.setMine(user.id, args.category, args.enabled);
    },
    setAllMyWhatsappPreferences: (
      _p: unknown,
      args: { enabled: boolean },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return whatsappPreferenceService.setAllMine(user.id, args.enabled);
    },

    // AiSensy is the system of record for templates and campaigns — these write
    // straight through and store nothing locally, which is why there is no
    // "draft" collection and no sync job to drift.
    createAisensyTemplate: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return createTemplate({
        name: args.input.name,
        category: args.input.category,
        language: args.input.language,
        type: args.input.type,
        body: args.input.body,
        sample: args.input.sample,
        headerText: args.input.header_text ?? undefined,
        footerText: args.input.footer_text ?? undefined,
      });
    },
    createAisensyCampaign: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return createCampaign(args.input.template_name, args.input.campaign_name);
    },
    deleteAisensyTemplate: (_p: unknown, args: { template_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return deleteTemplate(args.template_id);
    },
  },
};
