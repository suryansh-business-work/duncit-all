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

const VARIABLE_PATTERN = /(\{\{\d+\}\})/;
const VARIABLE_ONLY = /^\{\{\d+\}\}$/;

export function bodySegments(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let offset = 0;
  for (const part of body.split(VARIABLE_PATTERN)) {
    if (part) {
      segments.push({ id: String(offset), text: part, variable: VARIABLE_ONLY.test(part) });
    }
    offset += part.length;
  }
  return segments;
}
