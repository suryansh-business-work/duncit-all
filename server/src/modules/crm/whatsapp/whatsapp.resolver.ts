import { whatsappService, type WaConfigInput } from './whatsapp.service';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { WaConnectionDoc } from './whatsapp.model';

const RW = [...CRM_RW];

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
  },
  Mutation: {
    waSaveConfig: async (_p: unknown, args: { input: WaConfigInput }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toConnection(await whatsappService.saveConfig(args.input ?? {}));
    },
    waConnect: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toConnection(await whatsappService.connect());
    },
    waDisconnect: async (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return toConnection(await whatsappService.disconnect());
    },
  },
};
