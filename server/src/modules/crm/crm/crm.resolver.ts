import { crmService } from './crm.service';
import { leadSurveyService } from '@modules/survey/leadSurvey.service';
import { CRM_RW, type CrmLeadEntityType } from './crm.constants';
import { parseCrmLeadText, parseCrmLeadsText, leadAiChat, type CrmAiEntity, type ChatMessage } from './crm.ai';
import { callService } from '@modules/crm/call/call.service';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { buildTemplateBase64, exportLeadsBase64, importLeads, inspectImport, type CrmExcelEntity, type ImportColumnMapping } from './crm.excel';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { GraphQLError } from 'graphql';
import type { CommsLogEntity } from '@modules/crm/communicationLog/communicationLog.model';
import { findLeadDuplicates } from '@modules/crm/leadDuplicate/leadDuplicate.service';
import { listAssignableUsers, usersByIds } from '@modules/crm/crmUser/crmUser.service';
import { manualLogService, type CreateLogInput, type UpdateLogInput } from '@modules/crm/manualLog/manualLog.service';
import { canChangeLog, type StoredActivity } from '@modules/crm/manualLog/manualLog.view';
import type { LeadNearInput } from '@modules/crm/leadGeo/leadGeo.nearby';

const RW = [...CRM_RW];

const MAX_DUPLICATE_CONTACTS = 20;

interface DuplicateCheckInput {
  entity_type: CrmLeadEntityType;
  lead_id?: string | null;
  contacts?: Array<{ mobile_number?: string | null; email?: string | null }> | null;
  website?: string | null;
}

/** The lead a call is placed for: `entity_type` (any lead kind) or the older `entity` (venue/host/ecomm). */
interface CallLeadArgs {
  entity?: CrmAiEntity | null;
  entity_type?: CommsLogEntity | null;
  id: string;
  contact_number: string;
}

function callEntity(args: CallLeadArgs): CommsLogEntity {
  const entity = args.entity_type ?? args.entity;
  if (!entity) throw new GraphQLError('entity_type is required', { extensions: { code: 'BAD_USER_INPUT' } });
  return entity;
}

const callResult = (result: { ok: boolean; message: string; code?: string | null; log: { id: string; external_id?: string | null } | null }) => ({
  ok: result.ok,
  message: result.message,
  code: result.code ?? null,
  log_id: result.log?.id ?? null,
  external_id: result.log?.external_id ?? null,
});

const templateFilename = (entity: CrmExcelEntity) =>
  entity === 'VENUE_LEAD' ? 'duncit-venue-leads-template.xlsx' : 'duncit-host-leads-template.xlsx';
const exportFilename = (entity: CrmExcelEntity) =>
  entity === 'VENUE_LEAD' ? 'duncit-venue-leads-export.xlsx' : 'duncit-host-leads-export.xlsx';

export const crmResolvers = {
  CrmActivity: {
    can_change: (parent: StoredActivity & { is_deleted?: boolean }, _a: unknown, ctx: GraphQLContext) => canChangeLog(parent, ctx.user),
  },
  VenueLead: {
    super_category: (parent: any) =>
      parent?.super_category_id ? crmService.superCategoryById(String(parent.super_category_id)) : null,
    linked_hosts: (parent: any) => crmService.linkedHostsFor(parent?.linked_host_ids ?? []),
    matched_user: (parent: any, _a: unknown, ctx: GraphQLContext) => leadSurveyService.matchedUserForLead(parent, ctx),
  },
  HostLead: {
    super_category: (parent: any) =>
      parent?.super_category_id ? crmService.superCategoryById(String(parent.super_category_id)) : null,
    matched_user: (parent: any, _a: unknown, ctx: GraphQLContext) => leadSurveyService.matchedUserForLead(parent, ctx),
  },
  EcommLead: {
    super_category: (parent: any) =>
      parent?.super_category_id ? crmService.superCategoryById(String(parent.super_category_id)) : null,
    matched_user: (parent: any, _a: unknown, ctx: GraphQLContext) => leadSurveyService.matchedUserForLead(parent, ctx),
  },
  Query: {
    crmLeadConfig: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.config();
    },
    crmServices: (
      _p: unknown,
      args: { kind?: 'VENUE' | 'HOST' | 'ECOMM' | null; include_inactive?: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return crmService.listServices(args.kind ?? null, !!args.include_inactive);
    },
    crmDynamicFields: (
      _p: unknown,
      args: { entity?: CrmLeadEntityType | null; include_inactive?: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return crmService.listDynamicFields(args.entity ?? null, !!args.include_inactive);
    },
    venueLeads: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.listVenueLeads(args.filter);
    },
    venueLeadsTable: (_p: unknown, args: { query?: any; near?: LeadNearInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.venueLeadsTable(args.query, args.near);
    },
    venueLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.getVenueLead(args.id);
    },
    hostLeads: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.listHostLeads(args.filter);
    },
    hostLeadsTable: (_p: unknown, args: { query?: any; near?: LeadNearInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.hostLeadsTable(args.query, args.near);
    },
    hostLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.getHostLead(args.id);
    },
    ecommLeads: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.listEcommLeads(args.filter);
    },
    ecommLeadsTable: (_p: unknown, args: { query?: any; near?: LeadNearInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.ecommLeadsTable(args.query, args.near);
    },
    ecommLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.getEcommLead(args.id);
    },
    crmExcelTemplate: (_p: unknown, args: { entity: CrmExcelEntity }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return { filename: templateFilename(args.entity), content_base64: buildTemplateBase64(args.entity) };
    },
    crmExcelExport: async (_p: unknown, args: { entity: CrmExcelEntity }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return { filename: exportFilename(args.entity), content_base64: await exportLeadsBase64(args.entity) };
    },
    crmExcelInspect: (_p: unknown, args: { content_base64: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return inspectImport(args.content_base64);
    },
    crmCallFromNumber: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return (await getRuntimeEnvValue('TWILIO_PHONE_NUMBER')) || null;
    },
    crmLeadDuplicates: (_p: unknown, args: { input: DuplicateCheckInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      const { entity_type, lead_id, contacts, website } = args.input;
      // A form holds a handful of contacts; the cap keeps one call from becoming a bulk scan.
      return findLeadDuplicates({ contacts: contacts?.slice(0, MAX_DUPLICATE_CONTACTS), website }, { entity_type, id: lead_id });
    },
    crmAssignableUsers: (_p: unknown, args: { search?: string | null; limit?: number | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return listAssignableUsers(args.search, args.limit);
    },
    crmUsersByIds: (_p: unknown, args: { ids: string[] }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return usersByIds(args.ids);
    },
  },
  Mutation: {
    createCrmService: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.createService(args.input);
    },
    updateCrmService: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.updateService(args.id, args.input);
    },
    deleteCrmService: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.deleteService(args.id);
    },
    createVenueLead: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.createVenueLead(args.input);
    },
    updateVenueLead: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.updateVenueLead(args.id, args.input);
    },
    deleteVenueLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.deleteVenueLead(args.id);
    },
    createHostLead: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.createHostLead(args.input);
    },
    updateHostLead: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.updateHostLead(args.id, args.input);
    },
    deleteHostLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.deleteHostLead(args.id);
    },
    createEcommLead: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.createEcommLead(args.input);
    },
    updateEcommLead: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.updateEcommLead(args.id, args.input);
    },
    deleteEcommLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.deleteEcommLead(args.id);
    },
    emailEcommLeadContact: (
      _p: unknown,
      args: { id: string; contact_email: string; subject: string; body: string; provider_id?: string | null; attachments?: { url: string; name?: string | null }[] | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return crmService.emailEcommLeadContact(args.id, args.contact_email, args.subject, args.body, args.provider_id, user.id, args.attachments);
    },
    callEcommLeadContact: (
      _p: unknown,
      args: { id: string; contact_number: string; provider_id?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return crmService.callEcommLeadContact(args.id, args.contact_number, args.provider_id, user.id);
    },
    emailVenueLeadContact: (
      _p: unknown,
      args: { id: string; contact_email: string; subject: string; body: string; provider_id?: string | null; attachments?: { url: string; name?: string | null }[] | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return crmService.emailVenueLeadContact(args.id, args.contact_email, args.subject, args.body, args.provider_id, user.id, args.attachments);
    },
    callVenueLeadContact: (
      _p: unknown,
      args: { id: string; contact_number: string; provider_id?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return crmService.callVenueLeadContact(args.id, args.contact_number, args.provider_id, user.id);
    },
    emailHostLeadContact: (
      _p: unknown,
      args: { id: string; contact_email: string; subject: string; body: string; provider_id?: string | null; attachments?: { url: string; name?: string | null }[] | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return crmService.emailHostLeadContact(args.id, args.contact_email, args.subject, args.body, args.provider_id, user.id, args.attachments);
    },
    callHostLeadContact: (
      _p: unknown,
      args: { id: string; contact_number: string; provider_id?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return crmService.callHostLeadContact(args.id, args.contact_number, args.provider_id, user.id);
    },
    startCrmAiCall: async (
      _p: unknown,
      args: CallLeadArgs & { prompt_id: string; voice?: string | null; contact_name?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      const result = await callService.startAiCall({
        entity_type: callEntity(args),
        entity_id: args.id,
        to: args.contact_number,
        prompt_id: args.prompt_id,
        voice: args.voice ?? null,
        contact_name: args.contact_name ?? null,
        user_id: user.id,
      });
      return callResult(result);
    },
    startCrmPortalCall: async (
      _p: unknown,
      args: CallLeadArgs & { agent_number?: string | null; contact_name?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      const result = await callService.startPortalCall({
        entity_type: callEntity(args),
        entity_id: args.id,
        to: args.contact_number,
        agent_number: args.agent_number ?? null,
        contact_name: args.contact_name ?? null,
        user_id: user.id,
      });
      return callResult(result);
    },
    reconcileCrmCall: async (_p: unknown, args: { log_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      try {
        const r = await callService.reconcile(args.log_id);
        return { ok: r.ok, message: r.message, log_id: args.log_id, external_id: null, status: r.status ?? null };
      } catch (err: any) {
        return { ok: false, message: err?.message || 'Could not sync call status', log_id: args.log_id, external_id: null, status: null };
      }
    },
    aiParseCrmLead: async (
      _p: unknown,
      args: { entity: CrmAiEntity; text: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return parseCrmLeadText(args.entity, args.text);
    },
    aiParseCrmLeads: async (_p: unknown, args: { entity: CrmAiEntity; text: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return parseCrmLeadsText(args.entity, args.text);
    },
    crmLeadAiChat: async (_p: unknown, args: { entity: CrmAiEntity; lead_id: string; messages: ChatMessage[] }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return leadAiChat(args.entity, args.lead_id, args.messages);
    },
    crmExcelImport: async (
      _p: unknown,
      args: { entity: CrmExcelEntity; content_base64: string; mapping?: ImportColumnMapping[] | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return importLeads(args.entity, args.content_base64, args.mapping);
    },
    addCrmManualLog: (_p: unknown, args: { input: CreateLogInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return manualLogService.create(args.input, user);
    },
    updateCrmManualLog: (_p: unknown, args: { input: UpdateLogInput }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, RW);
      return manualLogService.update(args.input, user);
    },
    deleteCrmManualLog: (
      _p: unknown,
      args: { entity_type: CrmLeadEntityType; entity_id: string; log_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return manualLogService.remove(args, user);
    },
    createCrmDynamicField: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.createDynamicField(args.input);
    },
    updateCrmDynamicField: (
      _p: unknown,
      args: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return crmService.updateDynamicField(args.id, args.input);
    },
    deleteCrmDynamicField: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.deleteDynamicField(args.id);
    },
    reorderCrmDynamicFields: (_p: unknown, args: { ids: string[] }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.reorderDynamicFields(args.ids);
    },
  },
};
