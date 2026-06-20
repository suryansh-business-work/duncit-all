import { whatsappService, type WaConfigInput } from './whatsapp.service';
import { whatsappData } from './whatsapp.data';
import { buildLeadsWorkbook, parseLeadsWorkbook } from './whatsapp.excel';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { WaConnectionDoc } from './whatsapp.model';

const RW = [...CRM_RW];

type PageInput = {
  search?: string | null;
  page?: number | null;
  page_size?: number | null;
  sort_by?: string | null;
  sort_dir?: string | null;
  community_jid?: string | null;
};

const id = (d: any) => ({ ...d, id: String(d._id) });
const toUserLead = (d: any) => ({
  ...id(d),
  source_communities: d.source_communities ?? [],
  source_groups: d.source_groups ?? [],
  imported_at: d.imported_at ? new Date(d.imported_at).toISOString() : null,
});

type Page = { items: any[]; total: number; page: number; page_size: number };
const toPage = (p: Page, mapFn: (d: any) => any) => ({
  items: p.items.map(mapFn),
  total: p.total,
  page: p.page,
  page_size: p.page_size,
});

const toSyncResult = (c: {
  communities: number;
  groups: number;
  total: number;
  leads_created: number;
  valid: number;
  invalid: number;
  duplicates: number;
}) => ({
  communities: c.communities,
  groups: c.groups,
  contacts: c.total,
  leads: c.leads_created,
  valid: c.valid,
  invalid: c.invalid,
  duplicates: c.duplicates,
});

const toExtraction = (j: any) =>
  j
    ? {
        ...j,
        id: String(j._id),
        started_at: j.started_at ? new Date(j.started_at).toISOString() : null,
        finished_at: j.finished_at ? new Date(j.finished_at).toISOString() : null,
      }
    : null;

/** Public-safe view of the connection — never leak the raw API key. */
function toConnection(conn: WaConnectionDoc) {
  return {
    base_url: conn.base_url ?? '',
    session_id: conn.session_id ?? 'duncit-crm',
    has_api_key: !!conn.api_key,
    status: conn.status ?? 'DISCONNECTED',
    phone: conn.phone ?? null,
    last_error: conn.last_error ?? null,
    connected_at: conn.connected_at ? new Date(conn.connected_at).toISOString() : null,
  };
}

export const waLeadsResolvers = {
  Query: {
    waConnection: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toConnection(await whatsappService.getConnection());
    },
    waStatus: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toConnection(await whatsappService.refreshStatus());
    },
    waQr: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return whatsappService.qr();
    },
    waLeadStats: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return whatsappData.stats();
    },
    waCommunities: async (_p: unknown, args: { input?: PageInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toPage(await whatsappData.listCommunities(args.input ?? {}), id);
    },
    waGroups: async (_p: unknown, args: { input?: PageInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toPage(await whatsappData.listGroups(args.input ?? {}), id);
    },
    waContacts: async (_p: unknown, args: { input?: PageInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toPage(await whatsappData.listContacts(args.input ?? {}), id);
    },
    waUserLeads: async (_p: unknown, args: { input?: PageInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toPage(await whatsappData.listUserLeads(args.input ?? {}), toUserLead);
    },
    waUserLead: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      const lead = await whatsappData.getUserLead(args.id);
      return lead ? toUserLead(lead) : null;
    },
    waGroupMembers: async (_p: unknown, args: { group_jid: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return whatsappData.groupMembers(args.group_jid);
    },
    waExportUserLeads: async (_p: unknown, args: { search?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      const leads = await whatsappData.allUserLeads(args.search ?? null);
      return buildLeadsWorkbook(leads as any);
    },
    waExtraction: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toExtraction(await whatsappData.extractionStatus());
    },
  },
  Mutation: {
    waSaveConfig: async (_p: unknown, args: { input: WaConfigInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toConnection(await whatsappService.saveConfig(args.input ?? {}));
    },
    waGenerateApiKey: async (
      _p: unknown,
      args: { base_url: string; master_key: string },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      const { connection, api_key } = await whatsappService.generateApiKey(args);
      return { api_key, connection: toConnection(connection) };
    },
    waConnect: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toConnection(await whatsappService.connect());
    },
    waDisconnect: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toConnection(await whatsappService.disconnect());
    },
    waRefresh: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toSyncResult(await whatsappData.sync());
    },
    waStartExtraction: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toExtraction(await whatsappData.startExtraction());
    },
    waCancelExtraction: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toExtraction(await whatsappData.cancelExtraction());
    },
    waCleanData: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return whatsappData.clean();
    },
    waCreateUserLead: async (
      _p: unknown,
      args: { input: { phone: string; name?: string; source_account?: string } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return toUserLead(await whatsappData.createLead(args.input));
    },
    waUpdateUserLead: async (
      _p: unknown,
      args: { id: string; input: { name?: string; phone?: string } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      const lead = await whatsappData.updateLead(args.id, args.input ?? {});
      return lead ? toUserLead(lead) : null;
    },
    waDeleteUserLead: async (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return whatsappData.deleteLead(args.id);
    },
    waDeleteUserLeads: async (_p: unknown, args: { ids: string[] }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return whatsappData.deleteLeads(args.ids ?? []);
    },
    waImportUserLeads: async (_p: unknown, args: { file_base64: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      const rows = parseLeadsWorkbook(args.file_base64);
      return whatsappData.importLeads(rows);
    },
  },
};
