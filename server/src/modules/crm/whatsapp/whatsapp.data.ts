import {
  WaCommunityModel,
  WaContactModel,
  WaGroupModel,
  WaUserLeadModel,
} from './whatsapp.model';
import { createWaClient } from './whatsapp.client';
import { whatsappService } from './whatsapp.service';

const KEY = 'default';

// --- defensive normalisers (engine shapes vary: whatsapp-web.js / baileys) ----
function pickJid(obj: any): string {
  if (!obj) return '';
  const id = obj.id ?? obj.jid ?? obj.chatId ?? obj;
  if (typeof id === 'string') return id;
  return id?._serialized ?? id?.id ?? '';
}
function jidToPhone(jid: string): string {
  const local = String(jid || '').split('@')[0] ?? '';
  return local.replace(/[^\d]/g, '');
}
function pickName(obj: any): string {
  return obj?.name ?? obj?.subject ?? obj?.pushname ?? obj?.pushName ?? obj?.formattedName ?? '';
}

interface NormalisedContact {
  jid: string;
  phone: string;
  name: string;
  push_name: string;
  is_business: boolean;
  raw: any;
}
function normaliseContact(raw: any): NormalisedContact | null {
  const jid = pickJid(raw);
  const phone = raw?.number ? String(raw.number).replace(/[^\d]/g, '') : jidToPhone(jid);
  if (!jid || !phone) return null;
  // Skip groups/broadcast surfaced by the address book.
  if (jid.endsWith('@g.us') || jid.endsWith('@broadcast')) return null;
  return {
    jid,
    phone,
    name: pickName(raw),
    push_name: raw?.pushname ?? raw?.pushName ?? '',
    is_business: !!(raw?.isBusiness ?? raw?.isEnterprise),
    raw,
  };
}

async function getClientAndSession() {
  const conn = await whatsappService.getConnection();
  return { conn, client: createWaClient(conn.base_url, conn.api_key), sessionId: conn.session_id };
}

/** Upsert one User Lead by phone, merging source community/group provenance. */
async function upsertLead(args: {
  phone: string;
  name: string;
  contact_jid: string;
  source_account: string;
  community?: { jid: string; name: string } | null;
  group?: { jid: string; name: string } | null;
  raw?: any;
}) {
  const existing = await WaUserLeadModel.findOne({ connection_key: KEY, phone: args.phone });
  type Ref = { jid: string; name: string };
  const communities: Ref[] = (existing?.source_communities as Ref[]) ?? [];
  const groups: Ref[] = (existing?.source_groups as Ref[]) ?? [];
  if (args.community?.jid && !communities.some((c) => c.jid === args.community!.jid)) {
    communities.push(args.community);
  }
  if (args.group?.jid && !groups.some((g) => g.jid === args.group!.jid)) {
    groups.push(args.group);
  }
  await WaUserLeadModel.updateOne(
    { connection_key: KEY, phone: args.phone },
    {
      $set: {
        name: args.name || existing?.name || '',
        contact_jid: args.contact_jid || existing?.contact_jid || '',
        source_account: args.source_account || existing?.source_account || '',
        source_communities: communities,
        source_groups: groups,
        ...(args.raw ? { raw: args.raw } : {}),
      },
      $setOnInsert: { imported_at: new Date() },
    },
    { upsert: true }
  );
}

export const whatsappData = {
  /** Pull groups + contacts from the gateway, upsert the cache (dedupe via unique
   * indexes) and auto-create a User Lead per contact. Returns counts. */
  async sync() {
    const { conn, client, sessionId } = await getClientAndSession();
    const groups: any[] = (await client.listGroups(sessionId)) ?? [];
    const contacts: any[] = (await client.listContacts(sessionId)) ?? [];

    // Communities = distinct parent JIDs referenced by member groups.
    const nameByJid = new Map<string, string>();
    groups.forEach((g) => nameByJid.set(pickJid(g), pickName(g)));
    const communityJids = new Set(
      groups.map((g) => g.linkedParentJID).filter((j): j is string => !!j)
    );
    for (const cjid of communityJids) {
      const count = groups.filter((g) => g.linkedParentJID === cjid).length;
      await WaCommunityModel.updateOne(
        { connection_key: KEY, community_jid: cjid },
        { $set: { name: nameByJid.get(cjid) ?? cjid, groups_count: count } },
        { upsert: true }
      );
    }
    for (const g of groups) {
      const jid = pickJid(g);
      if (!jid || communityJids.has(jid)) continue; // skip the community parents themselves
      await WaGroupModel.updateOne(
        { connection_key: KEY, group_jid: jid },
        { $set: { name: pickName(g), community_jid: g.linkedParentJID ?? null, raw: g } },
        { upsert: true }
      );
    }

    let leadCount = 0;
    for (const raw of contacts) {
      const c = normaliseContact(raw);
      if (!c) continue;
      await WaContactModel.updateOne(
        { connection_key: KEY, contact_jid: c.jid },
        { $set: { phone: c.phone, name: c.name, push_name: c.push_name, is_business: c.is_business, raw: c.raw } },
        { upsert: true }
      );
      await upsertLead({
        phone: c.phone,
        name: c.name,
        contact_jid: c.jid,
        source_account: conn.phone ?? '',
        raw: c.raw,
      });
      leadCount += 1;
    }

    return {
      communities: communityJids.size,
      groups: groups.length - communityJids.size,
      contacts: contacts.length,
      leads: leadCount,
    };
  },

  /** Live-fetch a group's members, cache them as contacts and import each as a
   * lead tagged with this group (+ its community). Returns the members. */
  async groupMembers(groupJid: string) {
    const { conn, client, sessionId } = await getClientAndSession();
    const group = await WaGroupModel.findOne({ connection_key: KEY, group_jid: groupJid });
    const detail = await client.getGroup(sessionId, groupJid);
    const participants: any[] = detail?.participants ?? detail?.members ?? [];
    const community = group?.community_jid
      ? { jid: group.community_jid, name: (await communityName(group.community_jid)) }
      : null;
    const members = participants
      .map((p) => normaliseContact(p))
      .filter((m): m is NormalisedContact => m !== null);
    for (const m of members) {
      await upsertLead({
        phone: m.phone,
        name: m.name,
        contact_jid: m.jid,
        source_account: conn.phone ?? '',
        community,
        group: { jid: groupJid, name: group?.name ?? '' },
        raw: m.raw,
      });
    }
    return members.map((m) => ({ jid: m.jid, phone: m.phone, name: m.name, is_business: m.is_business }));
  },

  listCommunities: () => WaCommunityModel.find({ connection_key: KEY }).sort({ name: 1 }).lean(),
  listGroups: (communityJid?: string | null) =>
    WaGroupModel.find({
      connection_key: KEY,
      ...(communityJid ? { community_jid: communityJid } : {}),
    })
      .sort({ name: 1 })
      .lean(),
  listContacts: (search?: string | null) =>
    WaContactModel.find({
      connection_key: KEY,
      ...(search ? { $or: [{ name: rx(search) }, { phone: rx(search) }] } : {}),
    })
      .sort({ name: 1 })
      .limit(500)
      .lean(),
  listUserLeads: (search?: string | null) =>
    WaUserLeadModel.find({
      connection_key: KEY,
      ...(search ? { $or: [{ name: rx(search) }, { phone: rx(search) }] } : {}),
    })
      .sort({ imported_at: -1 })
      .limit(1000)
      .lean(),
  getUserLead: (id: string) => WaUserLeadModel.findById(id).lean(),
};

function rx(s: string) {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
async function communityName(jid: string): Promise<string> {
  const c = await WaCommunityModel.findOne({ connection_key: KEY, community_jid: jid }).lean();
  return c?.name ?? jid;
}
