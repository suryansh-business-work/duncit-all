import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { validate } from '@utils/validate';
import type { TableQueryInput } from '@utils/table-query';
import { CMS_ROLES, type CmsCollection } from './cms.constants';
import {
  cmsDraftInputSchema,
  cmsEntryInputSchema,
  cmsFragmentInputSchema,
  cmsPageInputSchema,
  cmsSiteInputSchema,
} from './cms.validator';
import { cmsSiteService } from './cmsSite.service';
import { cmsPageService } from './cmsPage.service';
import { cmsFragmentService } from './cmsFragment.service';
import { cmsEntryService } from './cmsEntry.service';
import { cmsContentService } from './cmsContent.service';
import { cmsRenderService } from './cmsRender.service';
import { cmsGoogleFontsService } from './cmsGoogleFonts.service';
import { cmsSiteDnsService } from './cmsSiteDns.service';
import { cmsSiteRevisionService } from './cmsSiteRevision.service';
import type { CmsSiteSection } from './cmsSiteRevision.model';
import { toFragment, toPage } from './cms.mappers';
import type { CmsVersionOwner } from './cmsVersion.model';
import { CmsPageModel } from './cmsPage.model';
import { CmsFragmentModel } from './cmsFragment.model';

type Args<T> = T;
type TableArgs = { site_id: string; query?: TableQueryInput | null };

/** Every CMS write and read is server-gated; the portal hiding a button is
 * never the guard. Returns the caller's id for `updated_by`. */
const editor = (ctx: GraphQLContext) => String(requireRole(ctx, CMS_ROLES).id);

/** DNS is the Tech → Domain seat's, website or not: one wrong A record takes a
 * live host down. A website manager without it sees the records refused. */
const DNS_ROLES = ['SUPER_ADMIN', 'TECH_MANAGER'];

export const cmsResolvers = {
  Query: {
    // Public — the website renderer calls these on every uncached request.
    cmsRender: (_p: unknown, args: Args<{ host: string; path: string; page?: number | null }>) =>
      cmsRenderService.render(args.host, args.path, args.page ?? 1),
    cmsSitemap: (_p: unknown, args: Args<{ host: string }>) => cmsRenderService.sitemap(args.host),

    cmsPreview: (_p: unknown, args: Args<{ page_id: string; entry_id?: string | null }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsRenderService.preview(args.page_id, args.entry_id);
    },
    cmsSiteRevisions: (_p: unknown, args: Args<{ site_id: string; section?: CmsSiteSection | null }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsSiteRevisionService.list(args.site_id, args.section);
    },
    cmsGoogleFonts: (
      _p: unknown,
      args: Args<{ search?: string | null; category?: string | null; offset?: number | null; limit?: number | null }>,
      ctx: GraphQLContext
    ) => {
      editor(ctx);
      return cmsGoogleFontsService.search(args);
    },
    cmsSiteDns: (_p: unknown, args: Args<{ site_id: string }>, ctx: GraphQLContext) => {
      requireRole(ctx, DNS_ROLES);
      return cmsSiteDnsService.records(args.site_id);
    },
    cmsSites: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsSiteService.list();
    },
    cmsSite: (_p: unknown, args: Args<{ site_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsSiteService.get(args.site_id);
    },
    cmsPagesTable: (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsPageService.table(args.site_id, args.query);
    },
    cmsPage: (_p: unknown, args: Args<{ page_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsPageService.get(args.page_id);
    },
    cmsFragmentsTable: (_p: unknown, args: TableArgs, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsFragmentService.table(args.site_id, args.query);
    },
    cmsFragments: (_p: unknown, args: Args<{ site_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsFragmentService.list(args.site_id);
    },
    cmsFragment: (_p: unknown, args: Args<{ fragment_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsFragmentService.get(args.fragment_id);
    },
    cmsVersions: (_p: unknown, args: Args<{ owner_kind: CmsVersionOwner; owner_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsContentService.versions(args.owner_kind, args.owner_id);
    },
    cmsEntriesTable: (
      _p: unknown,
      args: Args<{ site_id: string; collection_type: CmsCollection; query?: TableQueryInput | null }>,
      ctx: GraphQLContext
    ) => {
      editor(ctx);
      return cmsEntryService.table(args.site_id, args.collection_type, args.query);
    },
    cmsEntry: (_p: unknown, args: Args<{ entry_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsEntryService.get(args.entry_id);
    },
  },

  Mutation: {
    createCmsSite: async (_p: unknown, args: Args<{ input: unknown }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsSiteService.create(await validate(cmsSiteInputSchema, args.input));
    },
    // Each save is also a revision (cmsSiteRevision.service), so any earlier state can be restored.
    updateCmsSite: (_p: unknown, args: Args<{ site_id: string; input: unknown }>, ctx: GraphQLContext) =>
      cmsSiteRevisionService.save(args.site_id, 'SETTINGS', args.input, editor(ctx)),
    updateCmsSiteDesign: (_p: unknown, args: Args<{ site_id: string; input: unknown }>, ctx: GraphQLContext) =>
      cmsSiteRevisionService.save(args.site_id, 'DESIGN', args.input, editor(ctx)),
    updateCmsSiteCode: (_p: unknown, args: Args<{ site_id: string; input: unknown }>, ctx: GraphQLContext) =>
      cmsSiteRevisionService.save(args.site_id, 'CODE', args.input, editor(ctx)),
    restoreCmsSiteRevision: (_p: unknown, args: Args<{ revision_id: string }>, ctx: GraphQLContext) =>
      cmsSiteRevisionService.restore(args.revision_id, editor(ctx)),
    setCmsSiteARecord: (
      _p: unknown,
      args: Args<{ site_id: string; input: { host: string; ip: string; ttl?: number | null; current?: string | null } }>,
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, DNS_ROLES);
      return cmsSiteDnsService.setARecord(args.site_id, args.input, String(user.id));
    },
    deleteCmsSite: (_p: unknown, args: Args<{ site_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsSiteService.remove(args.site_id);
    },

    createCmsPage: async (_p: unknown, args: Args<{ site_id: string; input: unknown }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return cmsPageService.create(args.site_id, await validate(cmsPageInputSchema, args.input), userId);
    },
    updateCmsPage: async (_p: unknown, args: Args<{ page_id: string; input: unknown }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return cmsPageService.update(args.page_id, await validate(cmsPageInputSchema, args.input), userId);
    },
    saveCmsPageDraft: async (_p: unknown, args: Args<{ page_id: string; input: unknown }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      const input = await validate(cmsDraftInputSchema, args.input);
      return toPage(await cmsContentService.saveDraft(CmsPageModel, 'PAGE', args.page_id, input, userId));
    },
    publishCmsPage: async (_p: unknown, args: Args<{ page_id: string }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return toPage(await cmsContentService.publish(CmsPageModel, 'PAGE', args.page_id, userId));
    },
    unpublishCmsPage: async (_p: unknown, args: Args<{ page_id: string }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return toPage(await cmsContentService.unpublish(CmsPageModel, 'PAGE', args.page_id, userId));
    },
    duplicateCmsPage: (_p: unknown, args: Args<{ page_id: string; title: string; path: string }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return cmsPageService.duplicate(args.page_id, args.title, args.path, userId);
    },
    deleteCmsPage: (_p: unknown, args: Args<{ page_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsPageService.remove(args.page_id);
    },

    createCmsFragment: async (_p: unknown, args: Args<{ site_id: string; input: unknown }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return cmsFragmentService.create(args.site_id, await validate(cmsFragmentInputSchema, args.input), userId);
    },
    updateCmsFragment: async (_p: unknown, args: Args<{ fragment_id: string; input: unknown }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return cmsFragmentService.update(args.fragment_id, await validate(cmsFragmentInputSchema, args.input), userId);
    },
    saveCmsFragmentDraft: async (_p: unknown, args: Args<{ fragment_id: string; input: unknown }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      const input = await validate(cmsDraftInputSchema, args.input);
      return toFragment(await cmsContentService.saveDraft(CmsFragmentModel, 'FRAGMENT', args.fragment_id, input, userId));
    },
    publishCmsFragment: async (_p: unknown, args: Args<{ fragment_id: string }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return toFragment(await cmsContentService.publish(CmsFragmentModel, 'FRAGMENT', args.fragment_id, userId));
    },
    deleteCmsFragment: (_p: unknown, args: Args<{ fragment_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsFragmentService.remove(args.fragment_id);
    },

    restoreCmsVersion: (_p: unknown, args: Args<{ version_id: string }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return cmsContentService.restore(args.version_id, userId);
    },

    createCmsEntry: async (_p: unknown, args: Args<{ site_id: string; input: unknown }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return cmsEntryService.create(args.site_id, await validate(cmsEntryInputSchema, args.input), userId);
    },
    updateCmsEntry: async (_p: unknown, args: Args<{ entry_id: string; input: unknown }>, ctx: GraphQLContext) => {
      const userId = editor(ctx);
      return cmsEntryService.update(args.entry_id, await validate(cmsEntryInputSchema, args.input), userId);
    },
    deleteCmsEntry: (_p: unknown, args: Args<{ entry_id: string }>, ctx: GraphQLContext) => {
      editor(ctx);
      return cmsEntryService.remove(args.entry_id);
    },
  },
};
