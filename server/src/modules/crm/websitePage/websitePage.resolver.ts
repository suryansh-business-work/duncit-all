import { websitePageService, type WebsiteEntity } from './websitePage.service';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = [...CRM_RW];

export const websitePageResolvers = {
  Query: {
    crmWebsitePages: (
      _p: unknown,
      args: { entity_type: WebsiteEntity; lead_id: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return websitePageService.list(args.entity_type, args.lead_id);
    },
    crmWebsitePagesTable: (
      _p: unknown,
      args: { entity_type: WebsiteEntity; lead_id: string; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return websitePageService.table(args.entity_type, args.lead_id, args.query);
    },
  },
  Mutation: {
    crmScrapeWebsitePages: (
      _p: unknown,
      args: { entity_type: WebsiteEntity; lead_id: string; limit: number },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return websitePageService.scrape(args.entity_type, args.lead_id, args.limit);
    },
    crmFetchWebsitePageContent: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return websitePageService.fetchContent(args.id);
    },
    crmDeleteWebsitePage: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return websitePageService.remove(args.id);
    },
  },
};
