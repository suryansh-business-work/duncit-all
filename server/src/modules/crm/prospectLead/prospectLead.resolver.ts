import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import type { LeadNearInput } from '@modules/crm/leadGeo/leadGeo.nearby';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import { crmService } from '@modules/crm/crm/crm.service';
import { prospectLeadService } from './prospectLead.service';
import type { ProspectKind } from './prospectLead.config';

const RW = [...CRM_RW];

type LeadInput = Record<string, unknown>;
type Attachments = { url: string; name?: string | null }[] | null;

const superCategory = (parent: { super_category_id?: string | null }) =>
  parent?.super_category_id ? crmService.superCategoryById(String(parent.super_category_id)) : null;

/** Query + mutation resolvers for one prospect kind, all gated to CRM staff. */
function kindResolvers(kind: ProspectKind) {
  return {
    table: (_p: unknown, args: { query?: TableQueryInput | null; near?: LeadNearInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return prospectLeadService.table(kind, args.query, args.near);
    },
    get: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return prospectLeadService.get(kind, args.id);
    },
    create: (_p: unknown, args: { input: LeadInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return prospectLeadService.create(kind, args.input);
    },
    update: (_p: unknown, args: { id: string; input: LeadInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return prospectLeadService.update(kind, args.id, args.input);
    },
    remove: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return prospectLeadService.remove(kind, args.id);
    },
  };
}

const creator = kindResolvers('CREATOR_LEAD');
const community = kindResolvers('COMMUNITY_LEAD');

export const prospectLeadResolvers = {
  CreatorLead: { super_category: superCategory },
  CommunityLead: { super_category: superCategory },
  Query: {
    creatorLeadsTable: creator.table,
    creatorLead: creator.get,
    communityLeadsTable: community.table,
    communityLead: community.get,
  },
  Mutation: {
    createCreatorLead: creator.create,
    updateCreatorLead: creator.update,
    deleteCreatorLead: creator.remove,
    createCommunityLead: community.create,
    updateCommunityLead: community.update,
    deleteCommunityLead: community.remove,
    emailCrmLeadContact: (
      _p: unknown,
      args: {
        entity_type: ProspectKind;
        id: string;
        contact_email: string;
        subject: string;
        body: string;
        provider_id?: string | null;
        attachments?: Attachments;
      },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return prospectLeadService.email(
        args.entity_type,
        args.id,
        {
          to: args.contact_email,
          subject: args.subject,
          body: args.body,
          providerId: args.provider_id,
          attachments: args.attachments,
        },
        user.id
      );
    },
    callCrmLeadContact: (
      _p: unknown,
      args: { entity_type: ProspectKind; id: string; contact_number: string; provider_id?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return prospectLeadService.call(args.entity_type, args.id, args.contact_number, args.provider_id, user.id);
    },
  },
};
