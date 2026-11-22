import { formatProblem } from '@utils/field-formats';
import { emailKey, phoneKey } from '@modules/crm/marketing/leads/marketingLead.keys';
import { websiteKey } from '@modules/crm/leadDuplicate/leadDuplicate.match';
import { instagramHandleOf, type LeadFacts } from '@modules/crm/leadQuality/leadQuality.lead';
import { cleanText, cleanUrl, type EvidenceDecision } from '@modules/crm/leadQuality/leadQuality.service';
import type { QualityLeadType } from '@modules/crm/leadQuality/leadQuality.rules';
import { SOURCE_KINDS, type CandidateSourceKind } from './leadResearch.model';

/**
 * A researched lead as it arrives (from a discovery step or an AI assistant)
 * turned into what the queue stores — every field cleaned and checked the way
 * the CRM lead form checks it, the identity keys it is de-duplicated on, and
 * the facts the quality checks read. Pure apart from the shared helpers.
 */

export interface CandidateSourceInput {
  kind?: CandidateSourceKind | null;
  url: string;
  title?: string | null;
  text?: string | null;
}

export interface CandidateInput {
  name: string;
  city?: string | null;
  area?: string | null;
  address?: string | null;
  category?: string | null;
  description?: string | null;
  phones?: readonly string[] | null;
  emails?: readonly string[] | null;
  website?: string | null;
  /** A profile link or a handle. */
  instagram?: string | null;
  sources?: readonly CandidateSourceInput[] | null;
  evidence?: readonly EvidenceDecision[] | null;
}

export interface CleanCandidate {
  name: string;
  city: string;
  area: string;
  address: string;
  category: string;
  description: string;
  phones: string[];
  emails: string[];
  website: string;
  instagram_handle: string;
  sources: Array<{ kind: CandidateSourceKind; url: string; title: string; text: string }>;
  keys: string[];
}

export const CANDIDATE_LIMITS = { name: { min: 2, max: 120 }, place: 80, address: 300, category: 80, description: 1000, contacts: 5, sources: 10, sourceText: 2000 } as const;

const distinct = (values: string[]) => [...new Set(values.filter(Boolean))];

/** Identity keys: the same business found twice, in one batch or a later one, shares at least one. */
export function candidateKeys(c: Pick<CleanCandidate, 'instagram_handle' | 'phones' | 'emails' | 'website'>): string[] {
  return distinct([
    c.instagram_handle ? `ig:${c.instagram_handle}` : '',
    ...c.phones.map((phone) => (phoneKey(phone) ? `phone:${phoneKey(phone)}` : '')),
    ...c.emails.map((email) => (emailKey(email) ? `email:${emailKey(email)}` : '')),
    websiteKey(c.website) ? `web:${websiteKey(c.website)}` : '',
  ]);
}

function cleanSources(raw: readonly CandidateSourceInput[], problems: string[]): CleanCandidate['sources'] {
  const sources: CleanCandidate['sources'] = [];
  for (const source of raw.slice(0, CANDIDATE_LIMITS.sources)) {
    const url = cleanUrl(source.url);
    if (!url) {
      problems.push(`source "${String(source.url).slice(0, 80)}" is not an http(s) link`);
      continue;
    }
    const kind = SOURCE_KINDS.includes(source.kind as CandidateSourceKind) ? (source.kind as CandidateSourceKind) : 'WEB';
    sources.push({ kind, url, title: cleanText(source.title, 200), text: cleanText(source.text, CANDIDATE_LIMITS.sourceText) });
  }
  return sources;
}

function cleanContacts(input: CandidateInput, problems: string[]): { phones: string[]; emails: string[] } {
  const phones = distinct((input.phones ?? []).map((p) => cleanText(p, 30))).slice(0, CANDIDATE_LIMITS.contacts);
  const emails = distinct((input.emails ?? []).map((e) => cleanText(e, 254).toLowerCase())).slice(0, CANDIDATE_LIMITS.contacts);
  for (const phone of phones) if (formatProblem('phone', phone)) problems.push(`phone "${phone}" ${formatProblem('phone', phone)}`);
  for (const email of emails) if (formatProblem('email', email)) problems.push(`email "${email}" ${formatProblem('email', email)}`);
  return { phones, emails };
}

/**
 * The candidate cleaned, or the reasons it was refused. `requireSource`: a
 * lead an AI assistant hands in must say where it was found — nothing is
 * accepted that cannot be traced back to a public page.
 */
export function cleanCandidate(input: CandidateInput, requireSource: boolean): { candidate: CleanCandidate | null; problems: string[] } {
  const problems: string[] = [];
  const name = cleanText(input.name, CANDIDATE_LIMITS.name.max);
  if (name.length < CANDIDATE_LIMITS.name.min) problems.push('a name of at least 2 characters is required');
  const { phones, emails } = cleanContacts(input, problems);
  const website = cleanUrl(input.website);
  if (input.website && !website) problems.push('the website must be an http(s) link');
  const instagram_handle = instagramHandleOf(cleanText(input.instagram, 200));
  if (input.instagram && !instagram_handle) problems.push('the Instagram value is not a profile link or handle');
  const sources = cleanSources(input.sources ?? [], problems);
  if (requireSource && sources.length === 0) problems.push('at least one public source link (where this lead was found) is required');
  if (!instagram_handle && !website && phones.length === 0 && emails.length === 0) {
    problems.push('at least one way to verify it is required: Instagram, website, phone or email');
  }
  if (problems.length > 0) return { candidate: null, problems };
  const base = { instagram_handle, phones, emails, website };
  return {
    candidate: {
      name,
      city: cleanText(input.city, CANDIDATE_LIMITS.place),
      area: cleanText(input.area, CANDIDATE_LIMITS.place),
      address: cleanText(input.address, CANDIDATE_LIMITS.address),
      category: cleanText(input.category, CANDIDATE_LIMITS.category),
      description: cleanText(input.description, CANDIDATE_LIMITS.description),
      ...base,
      sources,
      keys: candidateKeys(base),
    },
    problems,
  };
}

/** What the quality checks read about a candidate — the same facts a CRM lead gives them. */
export function candidateFacts(lead_type: QualityLeadType, id: string, c: Omit<CleanCandidate, 'keys' | 'sources'>): LeadFacts {
  return {
    id,
    entity_type: lead_type,
    name: c.name,
    city: c.city,
    area: c.area,
    address: c.address,
    emails: c.emails,
    phones: c.phones,
    website: c.website,
    instagram_handle: c.instagram_handle,
    lead_status: '',
  };
}
