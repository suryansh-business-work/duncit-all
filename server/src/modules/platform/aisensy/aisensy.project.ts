import { GraphQLError } from 'graphql';
import { getRuntimeEnvValue } from '@config/runtimeEnv';

/**
 * AiSensy Project API — the READ side of AiSensy.
 *
 * The campaign key (aisensy.gateway) only SENDS; it cannot read a campaign or a
 * template back. That needs this second, project-scoped credential, which the
 * Tech portal holds as Project ID + Project API Key.
 *
 * Confirmed from AiSensy's published reference: the base is
 * `{host}/project-apis/v1/project/{project_id}`, auth is the
 * `X-AiSensy-Project-API-Pwd` header, and `messages` is a path under it.
 * The two LIST paths below are the one thing their docs do not publish in
 * readable form (the reference renders only in a browser), so they follow the
 * same shape. A wrong path is not silent: the error carries the exact URL and
 * AiSensy's own reply, and correcting it is a one-line change here.
 */
const DEFAULT_BASE_URL = 'https://apis.aisensy.com';
const CAMPAIGNS_PATH = 'campaigns';
const TEMPLATES_PATH = 'templates';

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

async function projectGet(path: string): Promise<unknown> {
  const config = await projectConfig();
  if (!config) throw notConfigured();
  const url = `${config.baseUrl}/project-apis/v1/project/${config.projectId}/${path}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'X-AiSensy-Project-API-Pwd': config.key },
  });
  const body = await res.text();
  if (!res.ok) {
    // The URL is in the message on purpose: a 404 here means the path, not the
    // credentials, and the reader needs to see which path was asked for.
    throw new GraphQLError(`AiSensy Project API: GET ${url} → HTTP ${res.status} ${body.slice(0, 200)}`, {
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
}

export interface AisensyTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  /** The template's BODY text, with its {{1}} placeholders intact. */
  body: string;
  /** How many variables the body expects — the number of params a send needs. */
  param_count: number;
}

const str = (row: Record<string, any>, ...keys: string[]) => {
  for (const key of keys) {
    const value = trimmed(row[key]);
    if (value) return value;
  }
  return '';
};

/** The BODY component's text out of a WhatsApp template definition. */
function bodyText(row: Record<string, any>): string {
  const components = Array.isArray(row.components) ? row.components : [];
  const body = components.find((c: any) => String(c?.type ?? '').toUpperCase() === 'BODY');
  return trimmed(body?.text) || trimmed(row.body);
}

/** Highest {{n}} in the body — what "templateParams length" has to match. */
function paramCount(body: string): number {
  const numbers = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}

/** The project's API campaigns, as AiSensy has them right now. */
export async function listCampaigns(): Promise<AisensyCampaign[]> {
  return toArray(await projectGet(CAMPAIGNS_PATH)).map((row) => ({
    name: str(row, 'name', 'campaignName'),
    status: str(row, 'status', 'state'),
    template_name: str(row, 'templateName', 'template_name', 'template'),
    type: str(row, 'type', 'campaignType'),
  }));
}

/** The project's WhatsApp message templates. */
export async function listTemplates(): Promise<AisensyTemplate[]> {
  return toArray(await projectGet(TEMPLATES_PATH)).map((row) => {
    const body = bodyText(row);
    return {
      name: str(row, 'name', 'templateName', 'elementName'),
      status: str(row, 'status'),
      category: str(row, 'category'),
      language: str(row, 'language', 'languageCode', 'language_code'),
      body,
      param_count: paramCount(body),
    };
  });
}
