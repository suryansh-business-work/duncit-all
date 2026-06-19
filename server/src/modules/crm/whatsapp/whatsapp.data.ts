import {
  WaCommunityModel,
  WaContactModel,
  WaGroupModel,
  WaUserLeadModel,
  WaExtractionJobModel,
} from './whatsapp.model';
import { createWaClient } from './whatsapp.client';
import { whatsappService } from './whatsapp.service';
import { normalizePhone } from './whatsapp.phone';

const KEY = 'default';

export interface ExtractCounts {
  total: number;
  processed: number;
  valid: number;
  invalid: number;
  duplicates: number;
  communities: number;
  groups: number;
  leads_created: number;
}

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
}): Promise<{ created: boolean }> {
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
  return { created: !existing };
}

/**
 * Core extraction: pull groups + contacts from the gateway, cache communities /
 * groups / contacts, validate each phone, and upsert a deduped lead per valid
 * number. Reports progress + a quality breakdown via `onProgress`. Shared by the
 * synchronous Refresh (sync) and the background extraction job.
 */
async function extractCore(
  onProgress?: (c: ExtractCounts) => Promise<void> | void
): Promise<ExtractCounts> {
  const { conn, client, sessionId } = await getClientAndSession();
  const errors: string[] = [];
  const grab = async (label: string, p: Promise<any>): Promise<any[]> => {
    try {
      const res = await p;
      return Array.isArray(res) ? res : [];
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  };
  const groups: any[] = await grab('groups', client.listGroups(sessionId));
  const contacts: any[] = await grab('contacts', client.listContacts(sessionId));
  if (groups.length === 0 && contacts.length === 0 && errors.length > 0) {
    throw new Error(errors.join(' | '));
  }

  // Communities = distinct parent JIDs referenced by member groups.
  const nameByJid = new Map<string, string>();
  groups.forEach((g) => nameByJid.set(pickJid(g), pickName(g)));
  const communityJids = new Set(groups.map((g) => g.linkedParentJID).filter((j): j is string => !!j));
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
    if (!jid || communityJids.has(jid)) continue; // skip community parents
    await WaGroupModel.updateOne(
      { connection_key: KEY, group_jid: jid },
      { $set: { name: pickName(g), community_jid: g.linkedParentJID ?? null, raw: g } },
      { upsert: true }
    );
  }

  const counts: ExtractCounts = {
    total: contacts.length,
    processed: 0,
    valid: 0,
    invalid: 0,
    duplicates: 0,
    communities: communityJids.size,
    groups: groups.length - communityJids.size,
    leads_created: 0,
  };
  if (onProgress) await onProgress(counts);

  for (let i = 0; i < contacts.length; i += 1) {
    const c = normaliseContact(contacts[i]);
    const norm = c ? normalizePhone(c.phone) : { valid: false, phone: '' };
    if (!c || !norm.valid) {
      counts.invalid += 1;
    } else {
      await WaContactModel.updateOne(
        { connection_key: KEY, contact_jid: c.jid },
        { $set: { phone: norm.phone, name: c.name, push_name: c.push_name, is_business: c.is_business, raw: c.raw } },
        { upsert: true }
      );
      const { created } = await upsertLead({
        phone: norm.phone,
        name: c.name,
        contact_jid: c.jid,
        source_account: conn.phone ?? '',
        raw: c.raw,
      });
      counts.valid += 1;
      if (created) counts.leads_created += 1;
      else counts.duplicates += 1;
    }
    counts.processed = i + 1;
    if (onProgress && i % 25 === 0) await onProgress(counts);
  }
  if (onProgress) await onProgress(counts);
  return counts;
}

export const whatsappData = {
  /** Pull groups + contacts from the gateway, upsert the cache (dedupe via unique
   * indexes) and auto-create a User Lead per contact. Returns counts. */
  /** Synchronous extraction (used by the manual Refresh button). */
  sync: () => extractCore(),

  /** Run the extraction for a job id in the background, persisting live progress
   * + the final quality breakdown to the job document. */
  async runExtraction(jobId: string) {
    const save = (patch: Record<string, unknown>) =>
      WaExtractionJobModel.updateOne({ _id: jobId }, { $set: patch });
    try {
      await save({ phase: 'fetching' });
      const counts = await extractCore(async (c) => {
        await save({ phase: 'contacts', ...c });
      });
      await save({ status: 'DONE', phase: 'done', finished_at: new Date(), ...counts });
    } catch (error) {
      await save({
        status: 'FAILED',
        phase: 'failed',
        finished_at: new Date(),
        error: error instanceof Error ? error.message : 'Extraction failed',
      });
    }
  },

  /** Start a background extraction (no-op if one is already running). Returns the
   * job immediately; the UI polls extractionStatus() for live progress. */
  async startExtraction() {
    const running = await WaExtractionJobModel.findOne({ connection_key: KEY, status: 'RUNNING' })
      .sort({ started_at: -1 })
      .lean();
    if (running) return running;
    const job = await WaExtractionJobModel.create({ connection_key: KEY, status: 'RUNNING', phase: 'starting' });
    whatsappData.runExtraction(String(job._id)).catch(() => undefined);
    return job.toObject();
  },

  /** Latest extraction job (for progress polling), or null if none yet. */
  extractionStatus() {
    return WaExtractionJobModel.findOne({ connection_key: KEY }).sort({ started_at: -1 }).lean();
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

  async listCommunities(opts?: PageOpts) {
    return paginate(WaCommunityModel, { connection_key: KEY }, opts, { name: 1 });
  },
  async listGroups(opts?: PageOpts) {
    return paginate(WaGroupModel, { connection_key: KEY }, opts, { name: 1 });
  },
  async listContacts(opts?: PageOpts) {
    return paginate(WaContactModel, { connection_key: KEY }, opts, { name: 1 });
  },
  async listUserLeads(opts?: PageOpts) {
    return paginate(WaUserLeadModel, { connection_key: KEY }, opts, { imported_at: -1 });
  },
  getUserLead: (id: string) => WaUserLeadModel.findById(id).lean(),

  /** All leads matching an optional search (unpaginated — used for export). */
  allUserLeads: (search?: string | null) =>
    WaUserLeadModel.find({
      connection_key: KEY,
      ...(search ? { $or: [{ name: rx(search) }, { phone: rx(search) }] } : {}),
    })
      .sort({ imported_at: -1 })
      .lean(),

  /** Top-of-page dashboard counters. */
  async stats() {
    const [leads, communities, groups, contacts] = await Promise.all([
      WaUserLeadModel.countDocuments({ connection_key: KEY }),
      WaCommunityModel.countDocuments({ connection_key: KEY }),
      WaGroupModel.countDocuments({ connection_key: KEY }),
      WaContactModel.countDocuments({ connection_key: KEY }),
    ]);
    return { total_leads: leads, total_communities: communities, total_groups: groups, total_contacts: contacts };
  },

  /** Manually create (or update by phone) a single user lead. Rejects junk. */
  async createLead(input: { phone: string; name?: string; source_account?: string }) {
    const { valid, phone } = normalizePhone(input.phone);
    if (!valid) throw new Error('Enter a valid phone number (8–15 digits, with country code).');
    await upsertLead({
      phone,
      name: input.name ?? '',
      contact_jid: '',
      source_account: input.source_account || 'Manual',
    });
    return WaUserLeadModel.findOne({ connection_key: KEY, phone }).lean();
  },

  /** Bulk import lead rows; validates + dedupes by phone. */
  async importLeads(rows: { phone: string; name?: string }[]) {
    let imported = 0;
    let duplicates = 0;
    let skipped = 0;
    for (const row of rows) {
      const { valid, phone } = normalizePhone(row.phone);
      if (!valid) {
        skipped += 1;
        continue;
      }
      const { created } = await upsertLead({
        phone,
        name: row.name ?? '',
        contact_jid: '',
        source_account: 'Excel Import',
      });
      if (created) imported += 1;
      else duplicates += 1;
    }
    return { imported, duplicates, skipped };
  },
};

function rx(s: string) {
  return new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

export interface PageOpts {
  search?: string | null;
  page?: number | null;
  page_size?: number | null;
  sort_by?: string | null;
  sort_dir?: string | null;
  community_jid?: string | null;
}

const SORTABLE = new Set(['name', 'phone', 'imported_at', 'created_at', 'members_count', 'groups_count']);

/** Server-side pagination + search + whitelisted sorting → { items, total }. */
async function paginate(
  Model: { find: (f: Record<string, unknown>) => any; countDocuments: (f: Record<string, unknown>) => Promise<number> },
  baseFilter: Record<string, unknown>,
  opts: PageOpts | undefined,
  defaultSort: Record<string, 1 | -1>
) {
  const o = opts ?? {};
  const filter: Record<string, unknown> = { ...baseFilter };
  if (o.community_jid) filter.community_jid = o.community_jid;
  if (o.search) filter.$or = [{ name: rx(o.search) }, { phone: rx(o.search) }];
  const page = Math.max(1, Math.trunc(o.page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Math.trunc(o.page_size ?? 25)));
  const sort: Record<string, 1 | -1> =
    o.sort_by && SORTABLE.has(o.sort_by) ? { [o.sort_by]: o.sort_dir === 'asc' ? 1 : -1 } : defaultSort;
  const [items, total] = await Promise.all([
    Model.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize).lean(),
    Model.countDocuments(filter),
  ]);
  return { items, total, page, page_size: pageSize };
}
async function communityName(jid: string): Promise<string> {
  const c = await WaCommunityModel.findOne({ connection_key: KEY, community_jid: jid }).lean();
  return c?.name ?? jid;
}
