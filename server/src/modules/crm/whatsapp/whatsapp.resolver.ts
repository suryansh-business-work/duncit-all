import { whatsappService, type WaConfigInput } from './whatsapp.service';
import { whatsappData } from './whatsapp.data';
import { buildLeadsWorkbook, parseLeadsWorkbook } from './whatsapp.excel';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { WaConnectionDoc } from './whatsapp.model';

const RW = [...CRM_RW];

const id = (d: any) => ({ ...d, id: String(d._id) });
const toUserLead = (d: any) => ({
  ...id(d),
  source_communities: d.source_communities ?? [],
  source_groups: d.source_groups ?? [],
  imported_at: d.imported_at ? new Date(d.imported_at).toISOString() : null,
});

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
    waCommunities: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return (await whatsappData.listCommunities()).map(id);
    },
    waGroups: async (_p: unknown, args: { community_jid?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return (await whatsappData.listGroups(args.community_jid ?? null)).map(id);
    },
    waContacts: async (_p: unknown, args: { search?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return (await whatsappData.listContacts(args.search ?? null)).map(id);
    },
    waUserLeads: async (_p: unknown, args: { search?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return (await whatsappData.listUserLeads(args.search ?? null)).map(toUserLead);
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
      const leads = await whatsappData.listUserLeads(args.search ?? null);
      return buildLeadsWorkbook(leads as any);
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
      return whatsappData.sync();
    },
    waCreateUserLead: async (
      _p: unknown,
      args: { input: { phone: string; name?: string; source_account?: string } },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return toUserLead(await whatsappData.createLead(args.input));
    },
    waImportUserLeads: async (_p: unknown, args: { file_base64: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      const rows = parseLeadsWorkbook(args.file_base64);
      return whatsappData.importLeads(rows);
    },
  },
};
