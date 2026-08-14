import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * AiSensy Project API — the READ side of AiSensy.
 *
 * The campaign key (aisensy.gateway) only SENDS; it cannot read a campaign or a
 * template back. That needs this second, project-scoped credential, which the
 * Tech portal holds as Project ID + Project API Key.
 *
 * Confirmed from AiSensy's Project API reference (aisensy.stoplight.io): the
 * base is `{host}/project-apis/v1/project/{project_id}`, auth is the
 * `X-AiSensy-Project-API-Pwd` header. "Get Campaigns" is — despite its name —
 * a POST of `{skip, limit, campaignType}` to `/campaigns` (a GET 404s), and
 * templates come from a GET on `/wa_template/` (trailing slash as documented,
 * `limit` capped at 100). The project id must be the 24-hex id from the
 * AiSensy dashboard, not the project's display name.
 */
const DEFAULT_BASE_URL = 'https://apis.aisensy.com';
const CAMPAIGNS_PATH = 'campaigns';
const TEMPLATES_PATH = 'wa_template/';
/** AiSensy's own per-page ceiling; asking for more returns 100 anyway. */
const PAGE_SIZE = 100;
/** A backstop, not a real bound — 20 pages is 2000 rows, far past any project. */
const MAX_PAGES = 20;

interface ProjectConfig {
  projectId: string;
  key: string;
  baseUrl: string;
}

const trimmed = (v: unknown) => String(v ?? '').trim();

/** The project credentials, or null when the Tech portal has not set them. */
export async function projectConfig(): Promise<ProjectConfig | null> {
  const [projectId, key, baseUrl] = await Promise.all([
    getRuntimeEnvValue('AISENSY_PROJECT_ID'),
    getRuntimeEnvValue('AISENSY_PROJECT_API_KEY'),
    getRuntimeEnvValue('AISENSY_PROJECT_API_BASE_URL'),
  ]);
  if (!trimmed(projectId) || !trimmed(key)) return null;
  return {
    projectId: trimmed(projectId),
    key: trimmed(key),
    baseUrl: (trimmed(baseUrl) || DEFAULT_BASE_URL).replace(/\/$/, ''),
  };
}

export async function isProjectApiConfigured(): Promise<boolean> {
  return (await projectConfig()) !== null;
}

const notConfigured = () =>
  new GraphQLError('Add the AiSensy Project ID and Project API Key in the Tech portal', {
    extensions: { code: 'BAD_REQUEST' },
  });

/** AiSensy project ids are Mongo-style 24-hex — the dashboard URL's id, never the name. */
const PROJECT_ID_RE = /^[\da-f]{24}$/i;

const badProjectId = () =>
  new GraphQLError(
    'AiSensy Project ID must be the 24-character id from your dashboard URL (app.aisensy.com/projects/<id>), not the project name — fix it in the Tech portal',
    { extensions: { code: 'BAD_REQUEST' } }
  );

async function projectRequest(
  path: string,
  postBody?: Record<string, unknown>,
  /** Only for verbs that carry no body — DELETE. A body always means POST. */
  bodylessMethod?: 'DELETE'
): Promise<unknown> {
  const config = await projectConfig();
  if (!config) throw notConfigured();
  if (!PROJECT_ID_RE.test(config.projectId)) throw badProjectId();
  const url = `${config.baseUrl}/project-apis/v1/project/${config.projectId}/${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-AiSensy-Project-API-Pwd': config.key,
  };
  const init: RequestInit = { headers };
  if (bodylessMethod) init.method = bodylessMethod;
  if (postBody) {
    init.method = 'POST';
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(postBody);
  }
  const res = await fetch(url, init);
  const body = await res.text();
  if (!res.ok) {
    // The URL is in the message on purpose: a 404 here means the path, not the
    // credentials, and the reader needs to see which path was asked for.
    const method = init.method ?? 'GET';
    throw new GraphQLError(`AiSensy Project API: ${method} ${url} → HTTP ${res.status} ${body.slice(0, 200)}`, {
      extensions: { code: 'BAD_GATEWAY' },
    });
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new GraphQLError(`AiSensy Project API returned a non-JSON body for ${path}`, {
      extensions: { code: 'BAD_GATEWAY' },
    });
  }
}

/** AiSensy wraps a collection under its own key per endpoint — take the first
 * array in the payload rather than betting on one wrapper name. */
function toArray(payload: unknown): Record<string, any>[] {
  if (Array.isArray(payload)) return payload;
  for (const value of Object.values((payload ?? {}) as Record<string, unknown>)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

export interface AisensyCampaign {
  name: string;
  status: string;
  template_name: string;
  type: string;
  /**
   * The header asset this campaign was configured with, if any.
   *
   * IT LIVES ON THE CAMPAIGN, NOT THE TEMPLATE. Every template this project
   * holds reports an empty `header_format`, which reads as "no template here
   * needs media" and is wrong: the media is attached when the campaign is built
   * in the AiSensy console, and the v2 send endpoint then REQUIRES it on every
   * message — a send without it comes back `Media URL Missing (HTTP 400)`.
   * Reading it here is what lets a send supply what the campaign already
   * expects.
   */
  media_url: string;
  media_filename: string;
}

export interface AisensyTemplate {
  /** AiSensy's own id — the only handle `deleteTemplate` accepts. */
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  /** The template's BODY text, with its {{1}} placeholders intact. */
  body: string;
  /** How many variables the body expects — the number of params a send needs. */
  param_count: number;
  /** The HEADER component's text — empty for a media header or no header. */
  header: string;
  /** TEXT, IMAGE, VIDEO, DOCUMENT — empty when the template has no header. */
  header_format: string;
  /** The small grey line under the body, when the template has one. */
  footer: string;
  /** The button labels WhatsApp draws under the message, in order. */
  buttons: string[];
}

const str = (row: Record<string, any>, ...keys: string[]) => {
  for (const key of keys) {
    const value = trimmed(row[key]);
    if (value) return value;
  }
  return '';
};

/** One component out of a WhatsApp template definition — HEADER, BODY, FOOTER
 * or BUTTONS. A template carries at most one of each. */
function componentOf(row: Record<string, any>, type: string): Record<string, any> | null {
  const components = Array.isArray(row.components) ? row.components : [];
  return components.find((c: any) => String(c?.type ?? '').toUpperCase() === type) ?? null;
}

/** The BODY component's text. AiSensy's Project API puts the full text
 * (body + button labels) in `text`. */
function bodyText(row: Record<string, any>): string {
  const body = componentOf(row, 'BODY');
  return trimmed(body?.text) || trimmed(row.body) || trimmed(row.text);
}

/** The header, as WhatsApp draws it: a bold line, or a media placeholder whose
 * kind is all a preview can show — the media itself is chosen per send. */
function headerOf(row: Record<string, any>): { header: string; header_format: string } {
  const header = componentOf(row, 'HEADER');
  if (!header) return { header: '', header_format: '' };
  return {
    header: trimmed(header.text),
    header_format: (trimmed(header.format) || 'TEXT').toUpperCase(),
  };
}

/** The button labels, in the order WhatsApp stacks them under the message. */
function buttonLabels(row: Record<string, any>): string[] {
  const block = componentOf(row, 'BUTTONS');
  const buttons = Array.isArray(block?.buttons) ? block.buttons : [];
  return buttons.map((button: any) => trimmed(button?.text)).filter(Boolean);
}

/**
 * Every row across every page. AiSensy caps a page at {@link PAGE_SIZE} and
 * offers no cursor, so a full list is a walk over `skip`.
 *
 * The walk ends on a short page. The identity guard is the other half of it:
 * an endpoint that ignores `skip` answers every request with page one, which
 * without the guard would spin to {@link MAX_PAGES} and return 2000 copies of
 * the same 100 rows. Both halves matter — the project is at 68 campaigns and 71
 * templates against a 100 ceiling, so this stops silently truncating the moment
 * the missing scenarios get their campaigns.
 */
async function listAll(
  page: (skip: number) => Promise<unknown>,
  keyOf: (row: Record<string, any>) => string
): Promise<Record<string, any>[]> {
  const rows: Record<string, any>[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < MAX_PAGES; index += 1) {
    // Sequential on purpose: the next skip is only worth asking for once this
    // page came back short-or-not, and AiSensy rate-limits the project API.
    // eslint-disable-next-line no-await-in-loop
    const batch = toArray(await page(index * PAGE_SIZE));
    const fresh = batch.filter((row) => !seen.has(keyOf(row)));
    for (const row of fresh) seen.add(keyOf(row));
    rows.push(...fresh);
    if (batch.length < PAGE_SIZE || fresh.length === 0) break;
  }
  return rows;
}

/**
 * Submit a new WhatsApp template for approval.
 *
 * It comes back `PENDING` — Meta decides, not AiSensy, and not synchronously.
 * The console re-reads {@link listTemplates} to learn the verdict, and a
 * rejection carries `rejected_reason`.
 *
 * There is NO update endpoint for a template, so editing one means deleting it
 * and submitting a new name. The UI is create-and-replace on purpose.
 */
export async function createTemplate(input: {
  name: string;
  category: string;
  language: string;
  /** TEXT for a plain template; IMAGE / VIDEO / FILE for a media header. */
  type: string;
  body: string;
  /** The same body with sample values in place — Meta reviews against this. */
  sample: string;
  headerText?: string;
  footerText?: string;
}): Promise<{ name: string; status: string; reason: string }> {
  const payload: Record<string, unknown> = {
    // AiSensy's own grouping label; it is required and not shown to recipients.
    label: input.name,
    name: input.name,
    category: input.category,
    language: input.language,
    type: input.type,
    text: input.body,
    sample_text: input.sample,
  };
  if (input.headerText) {
    payload.header_text = input.headerText;
    payload.header_type = 'TEXT';
  }
  // A media template declares its header through `type`; the asset itself is
  // supplied per send as `media: {url, filename}`, never here.
  if (input.type !== 'TEXT' && !input.headerText) payload.header_type = input.type;
  if (input.footerText) payload.footer_text = input.footerText;

  const row = (await projectRequest(TEMPLATES_PATH, payload)) as Record<string, any>;
  return {
    name: str(row, 'name', 'templateName') || input.name,
    status: str(row, 'status') || 'PENDING',
    reason: str(row, 'rejected_reason', 'rejectedReason'),
  };
}

/**
 * Bind an approved template to a campaign name.
 *
 * The campaign name is what the send transport posts, so this is the step that
 * makes a template reachable at all — seven of our approved templates have no
 * campaign and therefore cannot be sent by anything.
 *
 * AiSensy offers no update, stop or delete for campaigns, so a name chosen here
 * is permanent from the API's side.
 */
export async function createCampaign(
  templateName: string,
  campaignName: string
): Promise<{ name: string; status: string; template_name: string }> {
  const row = (await projectRequest('campaign/api', {
    template_name: templateName,
    campaign_name: campaignName,
  })) as Record<string, any>;
  return {
    name: str(row, 'name', 'campaignName') || campaignName,
    status: str(row, 'status') || 'LIVE',
    template_name: str(row, 'templateName', 'template_name') || templateName,
  };
}

/** Remove a template. WhatsApp's own policy on re-using a deleted name applies. */
export async function deleteTemplate(templateId: string): Promise<boolean> {
  await projectRequest(`${TEMPLATES_PATH}${encodeURIComponent(templateId)}`, undefined, 'DELETE');
  return true;
}

/** Highest {{n}} in the body — what "templateParams length" has to match. */
function paramCount(body: string): number {
  const numbers = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}

/** The project's campaigns, as AiSensy has them right now. */
export async function listCampaigns(): Promise<AisensyCampaign[]> {
  const rows = await listAll(
    (skip) => projectRequest(CAMPAIGNS_PATH, { skip, limit: PAGE_SIZE, campaignType: 'ALL' }),
    (row) => str(row, '_id', 'id') || str(row, 'name', 'campaignName')
  );
  return rows.map((row) => ({
    name: str(row, 'name', 'campaignName'),
    status: str(row, 'status', 'state'),
    template_name:
      trimmed(row.message_payload?.template?.name) || str(row, 'templateName', 'template_name', 'template'),
    type: str(row, 'type', 'campaignType'),
    media_url: trimmed(row.message_payload?.media?.url),
    media_filename: trimmed(row.message_payload?.media?.filename),
  }));
}

/** The project's WhatsApp message templates. */
export async function listTemplates(): Promise<AisensyTemplate[]> {
  const rows = await listAll(
    (skip) => projectRequest(`${TEMPLATES_PATH}?limit=${PAGE_SIZE}&skip=${skip}`),
    // The same template exists once per language, so the name alone is not a row.
    (row) =>
      str(row, '_id', 'id') ||
      `${str(row, 'name', 'templateName', 'elementName')}:${str(row, 'language', 'languageCode', 'language_code')}`
  );
  return rows.map((row) => {
    const body = bodyText(row);
    // AiSensy declares the count itself; the regex is the fallback for rows
    // that predate the field.
    const declared = Number(row.total_parameters);
    const param_count = Number.isInteger(declared) && declared > 0 ? declared : paramCount(body);
    return {
      id: str(row, '_id', 'id'),
      name: str(row, 'name', 'templateName', 'elementName'),
      status: str(row, 'status'),
      category: str(row, 'category'),
      language: str(row, 'language', 'languageCode', 'language_code'),
      body,
      param_count,
      ...headerOf(row),
      footer: trimmed(componentOf(row, 'FOOTER')?.text),
      buttons: buttonLabels(row),
    };
  });
}
