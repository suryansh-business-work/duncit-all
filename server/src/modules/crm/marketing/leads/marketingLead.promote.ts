import { crmService } from '@modules/crm/crm/crm.service';
import { MarketingLeadModel, type MarketingLeadDoc } from './marketingLead.model';
import { leadActor, loadLead, marketingLeadService, refuse, timelineEntry, type PublicLead } from './marketingLead.service';
import { CRM_KIND_FOR_PIPELINE, LEAD_CRM_KINDS, type MarketingLeadCrmKind, type MarketingLeadSource } from './marketingLead.types';

/**
 * Hand a lead to sales: a CRM record is made through the CRM's own create
 * function (its phone-uniqueness rule included), the lead remembers which
 * record it became, and it can never be promoted twice. One way only — the
 * CRM record is sales' from then on and nothing here writes to it again.
 */

/** The CRM's lead_source vocabulary (crm.constants LEAD_SOURCES) for each of ours. */
const CRM_SOURCE: Record<MarketingLeadSource, string> = {
  INSTAGRAM: 'Instagram',
  GOOGLE_PLACES: 'Cold Outreach',
  WEB_SEARCH: 'Cold Outreach',
  IMPORT: 'Other',
  MANUAL: 'Other',
};

interface CrmContact {
  name: string;
  role: string;
  mobile_number: string;
  whatsapp_number: string;
  email: string;
}

/** One CRM contact per phone, the emails spread across them; an email-only lead gets one contact. */
export function crmContacts(doc: Pick<MarketingLeadDoc, 'name' | 'phones' | 'emails'>): CrmContact[] {
  const phones = doc.phones ?? [];
  const emails = doc.emails ?? [];
  const count = Math.max(phones.length, emails.length > 0 ? 1 : 0);
  return Array.from({ length: count }, (_unused, index) => ({
    name: doc.name,
    role: '',
    mobile_number: phones[index] ?? '',
    whatsapp_number: phones[index] ?? '',
    email: emails[index] ?? '',
  }));
}

const remark = (doc: MarketingLeadDoc) =>
  [`Promoted from Marketing lead ${String(doc._id)}.`, doc.score_reason ? `Fit: ${doc.score_reason}` : ''].filter(Boolean).join(' ');

const instagramLink = (doc: MarketingLeadDoc) => (doc.instagram_handle ? `https://www.instagram.com/${doc.instagram_handle}/` : '');

/** The CRM input for each kind. The CRM's own required fields decide what a lead must carry first. */
function crmInput(kind: MarketingLeadCrmKind, doc: MarketingLeadDoc): Record<string, unknown> {
  const shared = {
    city: doc.city ?? '',
    contacts: crmContacts(doc),
    website: doc.website ?? '',
    tags: doc.tags ?? [],
    lead_source: CRM_SOURCE[doc.source],
  };
  if (kind === 'VENUE') {
    return { ...shared, venue_name: doc.company || doc.name, full_address: [doc.company || doc.name, doc.city].filter(Boolean).join(', '), remarks: remark(doc) };
  }
  if (kind === 'HOST') {
    return { ...shared, host_name: doc.name, organization_name: doc.company ?? '', instagram_link: instagramLink(doc), notes: remark(doc) };
  }
  return { ...shared, seller_name: doc.name, brand_name: doc.company ?? '', instagram_link: instagramLink(doc), notes: remark(doc) };
}

async function createCrmLead(kind: MarketingLeadCrmKind, doc: MarketingLeadDoc): Promise<string> {
  const input = crmInput(kind, doc);
  if (kind === 'VENUE') return String((await crmService.createVenueLead(input)).id);
  if (kind === 'HOST') return String((await crmService.createHostLead(input)).id);
  return String((await crmService.createEcommLead(input)).id);
}

function checkPromotable(doc: MarketingLeadDoc, kind: MarketingLeadCrmKind): void {
  if (!LEAD_CRM_KINDS.includes(kind)) refuse('That CRM record kind does not exist.');
  if (doc.crm_ref?.kind) refuse(`This lead was already promoted to a ${doc.crm_ref.kind} lead.`, 'CONFLICT');
  const expected = CRM_KIND_FOR_PIPELINE[doc.pipeline];
  if (!expected) {
    refuse(`A ${doc.pipeline} lead cannot be promoted. Only VENUE, HOST, BRAND and ADVERTISER leads become CRM leads (VENUE, HOST, ECOMM).`);
  }
  if (expected !== kind) refuse(`A ${doc.pipeline} lead becomes a ${expected} lead in the CRM, not ${kind}.`);
  if (kind === 'VENUE' && !doc.city) refuse('Add a city to the lead before promoting it to a venue lead.');
}

/**
 * Promote one lead. The row is claimed before the CRM record is made, so two
 * clicks cannot make two records; a CRM refusal (a duplicate phone, say)
 * releases the claim and is passed on as it was said.
 */
export async function promoteToCrm(id: string, kind: MarketingLeadCrmKind, user: { id: string; email?: string | null }): Promise<PublicLead> {
  const doc = await loadLead(id);
  checkPromotable(doc, kind);
  const actor = await leadActor(user);
  const claimed = await MarketingLeadModel.updateOne({ _id: id, promoted: false }, { $set: { promoted: true } });
  if (claimed.modifiedCount === 0) refuse('This lead was already promoted.', 'CONFLICT');
  let crmId: string;
  try {
    crmId = await createCrmLead(kind, doc);
  } catch (error) {
    await MarketingLeadModel.updateOne({ _id: id }, { $set: { promoted: false } });
    throw error;
  }
  await MarketingLeadModel.updateOne(
    { _id: id },
    {
      $set: { crm_ref: { kind, id: crmId, promoted_at: new Date(), promoted_by: actor.id ?? '' } },
      $push: { timeline: timelineEntry('PROMOTED', `Promoted to the CRM as a ${kind} lead`, actor) },
    }
  );
  return marketingLeadService.get(id);
}
