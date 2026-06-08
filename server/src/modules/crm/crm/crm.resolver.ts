import { crmService } from './crm.service';
import { leadSurveyService } from '@modules/survey/leadSurvey.service';
import { CRM_RW } from './crm.constants';
import { parseCrmLeadText, parseCrmLeadsText, leadAiChat, type CrmAiEntity, type ChatMessage } from './crm.ai';
import { callService } from '@modules/crm/call/call.service';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import type { CommsLogEntity } from '@modules/crm/communicationLog/communicationLog.model';
import { buildTemplateBase64, exportLeadsBase64, importLeads, inspectImport, type CrmExcelEntity, type ImportColumnMapping } from './crm.excel';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = [...CRM_RW];

const templateFilename = (entity: CrmExcelEntity) =>
  entity === 'VENUE_LEAD' ? 'duncit-venue-leads-template.xlsx' : 'duncit-host-leads-template.xlsx';
const exportFilename = (entity: CrmExcelEntity) =>
  entity === 'VENUE_LEAD' ? 'duncit-venue-leads-export.xlsx' : 'duncit-host-leads-export.xlsx';

export const crmResolvers = {
  VenueLead: {
    super_category: (parent: any) =>
      parent?.super_category_id ? crmService.superCategoryById(String(parent.super_category_id)) : null,
    linked_hosts: (parent: any) => crmService.linkedHostsFor(parent?.linked_host_ids ?? []),
    matched_user: (parent: any) => leadSurveyService.matchedUserForLead(parent),
  },
  HostLead: {
    super_category: (parent: any) =>
      parent?.super_category_id ? crmService.superCategoryById(String(parent.super_category_id)) : null,
    matched_user: (parent: any) => leadSurveyService.matchedUserForLead(parent),
  },
  Query: {
    crmLeadConfig: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.config();
    },
    crmServices: (
      _p: unknown,
      args: { kind?: 'VENUE' | 'HOST' | null; include_inactive?: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return crmService.listServices(args.kind ?? null, !!args.include_inactive);
    },
    crmDynamicFields: (
      _p: unknown,
      args: { entity?: 'VENUE_LEAD' | 'HOST_LEAD' | null; include_inactive?: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return crmService.listDynamicFields(args.entity ?? null, !!args.include_inactive);
    },
    venueLeads: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.listVenueLeads(args.filter);
    },
    venueLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.getVenueLead(args.id);
    },
    hostLeads: (_p: unknown, args: { filter?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.listHostLeads(args.filter);
    },
    hostLead: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return crmService.getHostLead(args.id);
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
      args: {
        entity: CrmAiEntity;
        id: string;
        contact_number: string;
        prompt_id: string;
        voice?: string | null;
        contact_name?: string | null;
      },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      const result = await callService.startAiCall({
        entity_type: args.entity as CommsLogEntity,
        entity_id: args.id,
        to: args.contact_number,
        prompt_id: args.prompt_id,
        voice: args.voice ?? null,
        contact_name: args.contact_name ?? null,
        user_id: user.id,
      });
      return {
        ok: result.ok,
        message: result.message,
        log_id: result.log?.id ?? null,
        external_id: result.log?.external_id ?? null,
      };
    },
    startCrmPortalCall: async (
      _p: unknown,
      args: { entity: CrmAiEntity; id: string; contact_number: string; agent_number?: string | null; contact_name?: string | null },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      const result = await callService.startPortalCall({
        entity_type: args.entity as CommsLogEntity,
        entity_id: args.id,
        to: args.contact_number,
        agent_number: args.agent_number ?? null,
        contact_name: args.contact_name ?? null,
        user_id: user.id,
      });
      return {
        ok: result.ok,
        message: result.message,
        log_id: result.log?.id ?? null,
        external_id: result.log?.external_id ?? null,
      };
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
    addCrmManualLog: async (
      _p: unknown,
      args: {
        input: {
          entity_type: 'VENUE_LEAD' | 'HOST_LEAD';
          entity_id: string;
          summary?: string | null;
          body_html: string;
          body_text?: string | null;
        };
      },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return crmService.addManualLog({ ...args.input, by: user.id });
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
