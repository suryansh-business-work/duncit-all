import { logs } from '@observability/log';
import { askForJson, stringList, text } from '@modules/crm/marketing/social/social.llm';
import type { EvidenceDecision } from '@modules/crm/leadQuality/leadQuality.service';
import type { QualityItem } from '@modules/crm/leadQuality/leadQuality.rules';
import type { CandidateSourceInput } from './leadResearch.candidate';

/**
 * The two AI steps of lead research, both through AI Library prompts:
 *
 *  - planQueries: a discovery request → the Google / Google Maps searches.
 *    When the AI is off or unreadable, the searches are built from the words
 *    the person typed — discovery never stops for want of a plan.
 *  - readEvidence: a batch of found leads and their public text → the quality
 *    items each text proves. A "met" item is kept ONLY when its quote appears
 *    word for word in the source it names; anything else is dropped. So the
 *    AI can point at evidence, never invent it.
 */

const LOG = 'lead-research';
const MAX_QUERIES = 6;
const MIN_QUOTE = 8;
const MAX_QUOTE = 160;

export interface PlanRequest {
  lead_type: string;
  city: string;
  locality: string;
  category: string;
  keywords: string;
}

/** Searches from the typed words alone: the category/keywords with the locality and the city. */
export function fallbackQueries(request: PlanRequest): string[] {
  const place = [request.locality, request.city].filter(Boolean).join(' ');
  const topics = [request.category, ...request.keywords.split(/[,;]/)].map((t) => t.trim()).filter(Boolean);
  const queries = (topics.length > 0 ? topics : [request.lead_type.replace('_LEAD', '').toLowerCase()]).map((topic) => `${topic} ${place}`.trim());
  return [...new Set(queries)].slice(0, MAX_QUERIES);
}

export async function planQueries(request: PlanRequest, detail: string): Promise<{ queries: string[]; planned_by: 'AI' | 'FALLBACK'; note: string }> {
  const lines = [
    `Lead type: ${request.lead_type}`,
    `City: ${request.city || '-'}`,
    `Locality: ${request.locality || '-'}`,
    `Category: ${request.category || '-'}`,
    `Keywords: ${request.keywords || '-'}`,
  ];
  try {
    const answer = await askForJson({
      task: 'crm.lead_research_plan',
      systemKey: 'crm.lead_research.plan',
      userKey: 'crm.lead_research.plan.user',
      variables: { request: lines.join('\n') },
      detail,
      maxTokens: 500,
    });
    const queries = stringList(answer.queries, MAX_QUERIES)
      .map((q) => q.replaceAll(/site:\S+/gi, '').replaceAll('"', '').trim())
      .filter(Boolean);
    if (queries.length > 0) return { queries, planned_by: 'AI', note: '' };
  } catch (error) {
    logs.server.warn(LOG, 'plan', { error, detail, msg: 'AI plan failed; using the typed words' });
    return { queries: fallbackQueries(request), planned_by: 'FALLBACK', note: `AI search plan unavailable (${(error as Error).message}); searched the typed words.` };
  }
  return { queries: fallbackQueries(request), planned_by: 'FALLBACK', note: 'The AI returned no searches; searched the typed words.' };
}

export interface EvidenceLead {
  name: string;
  city: string;
  sources: readonly CandidateSourceInput[];
}

/** Lower-case with single spaces, so a quote matches its source regardless of line breaks and case. */
const normalise = (value: string) => value.toLowerCase().replaceAll(/\s+/g, ' ').trim();

/** The quote, when it is long enough and found word for word in the named source; otherwise null. */
export function provenQuote(quote: string, source: CandidateSourceInput | undefined): string | null {
  const clean = text(quote).slice(0, MAX_QUOTE);
  if (!source || clean.length < MIN_QUOTE) return null;
  return normalise(`${source.title ?? ''} ${source.text ?? ''}`).includes(normalise(clean)) ? clean : null;
}

function leadBlock(lead: EvidenceLead, index: number): string {
  const sources = lead.sources.map((s, i) => `S${i + 1} [${s.kind ?? 'WEB'}] ${s.url} — ${(s.title ?? '').trim()} ${(s.text ?? '').replaceAll(/\s+/g, ' ').slice(0, 900)}`);
  return [`Lead ${index + 1}: ${lead.name}${lead.city ? ` (${lead.city})` : ''}`, ...sources].join('\n');
}

/** Turn one lead's verdicts into evidence decisions, keeping only proven quotes on known items. */
function decisionsFor(raw: unknown, lead: EvidenceLead, known: ReadonlySet<string>): EvidenceDecision[] {
  const decisions: EvidenceDecision[] = [];
  const seen = new Set<string>();
  for (const entry of Array.isArray(raw) ? raw : []) {
    const item = (entry ?? {}) as Record<string, unknown>;
    const key = text(item.key);
    if (text(item.verdict) !== 'MET' || !known.has(key) || seen.has(key)) continue;
    const sourceIndex = Number.parseInt(text(item.source).replace(/^S/i, ''), 10) - 1;
    const source = lead.sources[sourceIndex];
    const quote = provenQuote(text(item.quote), source);
    if (!quote || !source) continue;
    seen.add(key);
    decisions.push({ item_key: key, status: 'VERIFIED', evidence: `"${quote}" — ${source.title || source.kind || 'source'}`, source_url: source.url });
  }
  return decisions;
}

/**
 * Evidence the leads' own public text proves, per lead (same order as given).
 * Failures leave every lead without AI evidence and are reported in `note`.
 */
export async function readEvidence(leads: readonly EvidenceLead[], items: readonly QualityItem[], detail: string): Promise<{ decisions: EvidenceDecision[][]; note: string }> {
  const empty = leads.map(() => [] as EvidenceDecision[]);
  const readable = items.filter((item) => item.auto_check === 'NONE');
  if (leads.length === 0 || readable.length === 0) return { decisions: empty, note: '' };
  try {
    const answer = await askForJson({
      task: 'crm.lead_research_verify',
      systemKey: 'crm.lead_research.verify',
      userKey: 'crm.lead_research.verify.user',
      variables: {
        items: readable.map((item) => `${item.key} — ${item.name}${item.guidance ? ` — ${item.guidance}` : ''}`).join('\n'),
        leads: leads.map(leadBlock).join('\n\n'),
      },
      detail,
      maxTokens: 2500,
    });
    const known = new Set(readable.map((item) => item.key));
    const decisions = leads.map(() => [] as EvidenceDecision[]);
    for (const entry of Array.isArray(answer.leads) ? answer.leads : []) {
      const row = (entry ?? {}) as Record<string, unknown>;
      const index = Number(row.lead) - 1;
      const lead = leads[index];
      if (lead && decisions[index]?.length === 0) decisions[index] = decisionsFor(row.items, lead, known);
    }
    return { decisions, note: '' };
  } catch (error) {
    logs.server.warn(LOG, 'evidence', { error, detail, msg: 'AI evidence reading failed; candidates keep only automatic checks' });
    return { decisions: empty, note: `AI evidence reading unavailable (${(error as Error).message}).` };
  }
}
