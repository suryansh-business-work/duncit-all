import type { StatusColorMap } from '@duncit/ui';
import type { AisensyCampaign, AisensyTemplate } from '../queries';

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

/** What the one search box matches a row against. */
export const campaignSearchText = (campaign: AisensyCampaign) =>
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
