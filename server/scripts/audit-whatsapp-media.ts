/**
 * What each WhatsApp scenario actually attaches today — read from AiSensy.
 *
 * Two complaints share one cause and neither is visible from the code: every
 * send site names no asset, so all 67 scenarios fall through to the ONE
 * platform default per header kind; and whatever URL that default points at is
 * what Meta fetches, so a link that answers `text/html` arrives in the chat as
 * an .html file rather than a ticket.
 *
 * The header kind is the fact that decides all of it, and it lives at AiSensy —
 * on the TEMPLATE, reachable only with the Project API credential the Tech
 * portal holds. So this reads it, pairs every registry scenario with its
 * campaign and template, and then FETCHES each default to report what the other
 * end will really receive. Read-only: it writes nothing, to Mongo or AiSensy.
 *
 * Run against whichever database you want the answer for:
 *   npx ts-node -r tsconfig-paths/register --transpile-only \
 *     scripts/audit-whatsapp-media.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { WA_EVENTS } from '../src/modules/platform/whatsapp/whatsapp.events';
import {
  WaEventSettingModel,
  WA_GLOBAL_KEY,
} from '../src/modules/platform/whatsapp/waEventSetting.model';
import {
  isProjectApiConfigured,
  listCampaigns,
  listTemplates,
  needsMedia,
} from '../src/modules/platform/aisensy/aisensy.project';

const log = (...m: unknown[]) => console.log('[wa-media-audit]', ...m);
const pad = (value: string, width: number) => value.padEnd(width).slice(0, width);

/** What the other end really receives when it fetches this URL. */
async function probe(url: string): Promise<string> {
  if (!url) return 'not set';
  try {
    const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
    const type = res.headers.get('content-type') ?? 'no content-type';
    return `HTTP ${res.status} ${type}`;
  } catch (error) {
    return `unreachable (${error instanceof Error ? error.message : 'failed'})`;
  }
}

/** A default that is not the kind of file its header wants is the whole bug. */
function verdict(kind: 'IMAGE' | 'DOCUMENT', probed: string): string {
  if (probed === 'not set') return 'nothing to send — every such scenario fails Media URL Missing';
  const wants = kind === 'IMAGE' ? 'image/' : 'application/';
  if (probed.includes(wants)) return 'OK';
  return `WRONG KIND — this is what arrives instead of a ${kind === 'IMAGE' ? 'picture' : 'PDF'}`;
}

async function reportDefaults(global: Record<string, any> | undefined): Promise<void> {
  const image = String(global?.override_media_url ?? '');
  const document = String(global?.default_document_url ?? '');
  const [imageProbe, documentProbe] = await Promise.all([probe(image), probe(document)]);
  log('');
  log('PLATFORM DEFAULTS  (Marketing > WhatsApp > Settings)');
  log(`  IMAGE     ${image || '(unset)'}`);
  log(`            ${imageProbe}  -> ${verdict('IMAGE', imageProbe)}`);
  log(`  DOCUMENT  ${document || '(unset)'}`);
  log(`            ${documentProbe}  -> ${verdict('DOCUMENT', documentProbe)}`);
}

interface Row {
  key: string;
  campaign: string;
  template: string;
  header: string;
  source: string;
}

/** Where the asset for this scenario comes from today, in the send path's order. */
function assetSource(own: Record<string, any> | undefined, campaignMedia: string, header: string): string {
  if (own?.override_media_url) return 'scenario override';
  if (campaignMedia) return 'campaign at AiSensy';
  if (!needsMedia(header)) return 'no header — nothing attached';
  return 'PLATFORM DEFAULT';
}

async function run(): Promise<void> {
  await connectDB();
  if (!(await isProjectApiConfigured())) {
    log('AiSensy Project API is not configured — set the Project ID and Project API Key');
    log('in the Tech portal (AISENSY category) and run this again.');
    return;
  }

  const [campaigns, templates, rows] = await Promise.all([
    listCampaigns(),
    listTemplates(),
    WaEventSettingModel.find({}).lean(),
  ]);
  log(`${campaigns.length} campaign(s), ${templates.length} template(s), ${rows.length} stored setting row(s)`);

  const byName = new Map(campaigns.map((c) => [c.name, c]));
  const templateByName = new Map(templates.map((t) => [t.name, t]));
  const settingByKey = new Map(rows.map((row) => [row.event_key, row]));
  await reportDefaults(settingByKey.get(WA_GLOBAL_KEY));

  const table: Row[] = WA_EVENTS.map((event) => {
    const campaign = byName.get(event.campaign);
    const template = campaign ? templateByName.get(campaign.template_name) : undefined;
    const header = template?.header_format ?? '';
    return {
      key: event.key,
      campaign: campaign ? event.campaign : `${event.campaign}  ** NO SUCH CAMPAIGN **`,
      template: template?.name ?? '(template not found)',
      header: header || 'none',
      source: assetSource(settingByKey.get(event.key), campaign?.media_url ?? '', header),
    };
  });

  log('');
  log(`${pad('SCENARIO', 34)}${pad('CAMPAIGN', 32)}${pad('HEADER', 8)}ASSET TODAY`);
  for (const row of table) {
    log(`${pad(row.key, 34)}${pad(row.campaign, 32)}${pad(row.header, 8)}${row.source}`);
  }

  const count = (predicate: (row: Row) => boolean) => table.filter(predicate).length;
  const onDefault = (header: string) =>
    count((row) => row.header === header && row.source === 'PLATFORM DEFAULT');
  log('');
  log('SUMMARY');
  log(`  IMAGE header: ${count((r) => r.header === 'IMAGE')} scenario(s), ${onDefault('IMAGE')} on the platform default`);
  log(`  FILE header:  ${count((r) => r.header === 'FILE')} scenario(s), ${onDefault('FILE')} on the platform default`);
  log(`  VIDEO header: ${count((r) => r.header === 'VIDEO')} scenario(s)`);
  log(`  no header:    ${count((r) => r.header === 'none')} scenario(s)`);
  log(`  campaign missing at AiSensy: ${count((r) => r.campaign.includes('NO SUCH'))}`);
}

run()
  .catch((error) => {
    console.error('[wa-media-audit] failed:', error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
