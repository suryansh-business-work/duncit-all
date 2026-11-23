import { Types } from 'mongoose';
import { LEAD_MODELS, LEAD_NAME_FIELDS } from '@modules/crm/crm/leadModels';
import { profileUsername } from '@modules/crm/marketing/igLeads/igLead.serper';
import type { QualityLeadType } from './leadQuality.rules';

/**
 * The facts about a lead the quality checks read, whichever of the five
 * collections it lives in — the name, where it is, how to reach it and where
 * it shows up online. Read-only; nothing here writes a lead.
 */

export interface LeadFacts {
  id: string;
  entity_type: QualityLeadType;
  name: string;
  city: string;
  area: string;
  address: string;
  emails: string[];
  phones: string[];
  website: string;
  instagram_handle: string;
  lead_status: string;
}

interface StoredContact {
  email?: string | null;
  mobile_number?: string | null;
  whatsapp_number?: string | null;
}

export type StoredLead = Record<string, unknown> & { _id: unknown; contacts?: StoredContact[] | null };

/** The read methods used here; the five models' generic signatures differ only in their document type. */
interface LeanReader {
  findById(id: string): { lean(): Promise<StoredLead | null> };
  find(
    filter: Record<string, unknown>,
    projection?: string
  ): {
    sort(sort: Record<string, 1 | -1>): { limit(n: number): { lean(): Promise<StoredLead[]> } };
  };
  updateOne(filter: Record<string, unknown>, update: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
  countDocuments(filter?: Record<string, unknown>): Promise<number>;
  aggregate<T>(pipeline: Record<string, unknown>[]): Promise<T[]>;
}

export const leadModel = (entity_type: QualityLeadType) => LEAD_MODELS[entity_type] as unknown as LeanReader;

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const distinct = (values: string[]) => [...new Set(values.filter(Boolean))];

/** "https://instagram.com/The.Barn/", "@the.barn" or "the.barn" → "the.barn"; '' when it is none of those. */
export function instagramHandleOf(raw: string): string {
  const text = raw.trim();
  if (!text) return '';
  if (/instagram\.com/i.test(text)) return profileUsername(/^https?:\/\//i.test(text) ? text : `https://${text}`) ?? '';
  const bare = text.replace(/^@/, '').toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(bare) ? bare : '';
}

export function leadFacts(entity_type: QualityLeadType, doc: StoredLead): LeadFacts {
  const contacts = doc.contacts ?? [];
  const handleSource = str(doc.instagram_link) || str(doc.handle);
  return {
    id: String(doc._id),
    entity_type,
    name: str(doc[LEAD_NAME_FIELDS[entity_type]]),
    city: str(doc.city),
    area: str(doc.area),
    address: str(doc.full_address),
    emails: distinct(contacts.map((c) => str(c?.email).toLowerCase())),
    phones: distinct(contacts.flatMap((c) => [str(c?.mobile_number), str(c?.whatsapp_number)])),
    website: str(doc.website),
    instagram_handle: instagramHandleOf(handleSource),
    lead_status: str(doc.lead_status),
  };
}

export async function loadLead(entity_type: QualityLeadType, id: string): Promise<StoredLead | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  return leadModel(entity_type).findById(id).lean();
}
