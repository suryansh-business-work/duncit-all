import { crmEmailTemplateService } from './crmEmailTemplate.service';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { crmEmailSettingsService, type BrandAssetInput } from './crmEmailSettings.service';
import { crmEmailAi, type CrmEmailAiInput } from './crmEmailAi';
import type { CrmEmailTheme } from './crmEmailTheme';

const RW = [...CRM_RW];
type ThemeInput = Partial<Record<keyof CrmEmailTheme, unknown>>;

export const crmEmailTemplateResolvers = {
  Query: {
    crmEmailTemplates: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.list();
    },
    crmEmailTemplatesTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.table(args.query);
    },
    crmEmailTemplate: (_p: unknown, args: { template_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.byId(args.template_id);
    },
    renderCrmEmailTemplate: (_p: unknown, args: { mjml: string; vars?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.render(args.mjml, args.vars);
    },
    crmEmailSettings: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailSettingsService.get();
    },
    crmEmailStarterMjml: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.starter();
    },
    crmEmailAiPrompts: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailAi.prompts();
    },
    renderCrmEmailThemePreview: (_p: unknown, args: { theme: ThemeInput; mjml?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.previewTheme(args.theme, args.mjml);
    },
  },
  Mutation: {
    createCrmEmailTemplate: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return crmEmailTemplateService.create(args.input, user.id);
    },
    updateCrmEmailTemplate: (_p: unknown, args: { template_id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.update(args.template_id, args.input);
    },
    deleteCrmEmailTemplate: (_p: unknown, args: { template_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.delete(args.template_id);
    },
    sendCrmTestEmail: (_p: unknown, args: { template_id: string; to: string; vars?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.sendTest(args.template_id, args.to, args.vars);
    },
    addCrmEmailTemplateImage: (_p: unknown, args: { template_id: string; image: { url: string; name?: string | null } }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.addImage(args.template_id, args.image);
    },
    removeCrmEmailTemplateImage: (_p: unknown, args: { template_id: string; url: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailTemplateService.removeImage(args.template_id, args.url);
    },
    updateCrmEmailTheme: (_p: unknown, args: { input: ThemeInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return crmEmailSettingsService.updateTheme(args.input, user.id);
    },
    resetCrmEmailTheme: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return crmEmailSettingsService.resetTheme(user.id);
    },
    addCrmEmailBrandAssets: (_p: unknown, args: { items: BrandAssetInput[] }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return crmEmailSettingsService.addAssets(args.items, user.id);
    },
    updateCrmEmailBrandAsset: (_p: unknown, args: { id: string; input: BrandAssetInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return crmEmailSettingsService.updateAsset(args.id, args.input, user.id);
    },
    removeCrmEmailBrandAsset: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return crmEmailSettingsService.removeAsset(args.id, user.id);
    },
    setCrmEmailPrimaryLogo: (_p: unknown, args: { id?: string | null }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return crmEmailSettingsService.setPrimaryLogo(args.id ?? null, user.id);
    },
    updateCrmEmailAiPrompt: (_p: unknown, args: { key: string; content: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailAi.updatePrompt(args.key, args.content);
    },
    resetCrmEmailAiPrompt: (_p: unknown, args: { key: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailAi.resetPrompt(args.key);
    },
    generateCrmEmailMjml: (_p: unknown, args: { input: CrmEmailAiInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmEmailAi.generate(args.input);
    },
  },
};
