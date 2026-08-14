import { templateSegments } from '@duncit/communication';
import type { StatusColorMap } from '@duncit/ui';
import type { AisensyCampaign, AisensyTemplate, WaCampaignNameOption } from '../queries';

/** A send only works against a Live campaign — every other state is the reason
 * a send would fail, so it is shown plainly rather than coloured as fine. */
export const AISENSY_CAMPAIGN_STATUS_COLORS: StatusColorMap = { LIVE: 'success' };

/** WhatsApp's own template vocabulary. */
export const AISENSY_TEMPLATE_STATUS_COLORS: StatusColorMap = {
  APPROVED: 'success',
  PENDING: 'warning',
  REJECTED: 'error',
};

/** AiSensy is not consistent about casing; the colour map is. */
export const statusKey = (status: string) => status.toUpperCase();

/**
 * A campaign row, from whichever source could answer.
 *
 * AiSensy's own list is the truth when the Project API is configured. When it
 * is not, the saved names carry the tab instead — sending is the point of this
 * screen, and a missing second credential must not take sending away. The row
 * says which source it came from, because "no status" and "status Live" are
 * different amounts of knowledge.
 */
export interface CampaignRow {
  name: string;
  status: string;
  type: string;
  template_name: string;
  /** False only for a live campaign AiSensy says is not Live. */
  sendable: boolean;
}

export function campaignRows(
  campaigns: AisensyCampaign[],
  names: WaCampaignNameOption[],
  live: boolean
): CampaignRow[] {
  if (live) {
    return campaigns.map((campaign) => ({
      name: campaign.name,
      status: campaign.status,
      type: campaign.type,
      template_name: campaign.template_name,
      sendable: statusKey(campaign.status) === 'LIVE',
    }));
  }
  return names.map((option) => ({
    name: option.name,
    status: '',
    type: option.description,
    template_name: '',
    sendable: true,
  }));
}

/** What the one search box matches a row against. */
export const campaignSearchText = (campaign: CampaignRow) =>
  `${campaign.name} ${campaign.status} ${campaign.type} ${campaign.template_name}`;

export const templateSearchText = (template: AisensyTemplate) =>
  `${template.name} ${template.status} ${template.category} ${template.language} ${template.body}`;

export const paramsLabel = (count: number) => (count === 1 ? '1 parameter' : `${count} parameters`);

/** A template body split into plain text and its {{n}} variables, so a preview
 * can highlight the parts a send has to fill. */
export interface BodySegment {
  /** The segment's character offset in the body — unique, so a stable key. */
  id: string;
  text: string;
  variable: boolean;
}

/** The split itself comes from `@duncit/communication`, which is where the one
 * `{{n}}` parser lives (rule 40) — this only adds the key a list needs. */
export function bodySegments(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let offset = 0;
  for (const segment of templateSegments(body)) {
    segments.push({ id: String(offset), text: segment.text, variable: segment.placeholder > 0 });
    offset += segment.text.length;
  }
  return segments;
}

/** Name plus language: the same template exists once per language, so the name
 * alone is not a row. */
export const templateRowId = (template: AisensyTemplate) =>
  `${template.name}-${template.language}`;

export interface ApprovedTemplateGroups {
  /** Approved templates no campaign points at. A send addresses a CAMPAIGN,
   * never a template, so these cannot go out at all until one exists — and
   * nothing in AiSensy's own console says so. */
  orphans: AisensyTemplate[];
  /** Approved templates a campaign already sends. */
  bound: AisensyTemplate[];
}

/** The approved half of the catalogue, split by whether anything can send it.
 * The banner shows the orphans; the campaign picker offers them first. */
export function approvedTemplateGroups(
  templates: AisensyTemplate[],
  campaigns: AisensyCampaign[]
): ApprovedTemplateGroups {
  const boundNames = new Set(campaigns.map((campaign) => campaign.template_name));
  const groups: ApprovedTemplateGroups = { orphans: [], bound: [] };
  for (const template of templates) {
    if (statusKey(template.status) !== 'APPROVED') continue;
    if (boundNames.has(template.name)) groups.bound.push(template);
    else groups.orphans.push(template);
  }
  return groups;
}
