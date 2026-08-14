import { renderTemplateBody, templateSegments } from '@duncit/communication';
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

/**
 * The split itself comes from `@duncit/communication`, which is where the one
 * `{{n}}` parser lives (rule 40) — this only adds the key a list needs.
 *
 * With `params`, each placeholder shows what the operator typed instead of its
 * `{{n}}`, still highlighted so the filled parts stay tellable from the
 * template's own words. A blank value keeps the placeholder visible rather than
 * collapsing the sentence around a gap, and a `{{first_name}}` token is shown
 * verbatim: the SERVER resolves those per recipient, so pretending to resolve
 * one here would be inventing a name.
 *
 * The id stays the offset in the RAW body, so it is unique whatever is
 * substituted in.
 */
export function bodySegments(body: string, params?: readonly string[]): BodySegment[] {
  const segments: BodySegment[] = [];
  let offset = 0;
  for (const segment of templateSegments(body)) {
    const filled = segment.placeholder > 0 ? (params?.[segment.placeholder - 1] ?? '') : '';
    segments.push({
      id: String(offset),
      text: filled || segment.text,
      variable: segment.placeholder > 0,
    });
    offset += segment.text.length;
  }
  return segments;
}

/** How much of the template's own wording a param row shows around its {{n}}. */
const CONTEXT_CHARS = 36;

const oneLine = (text: string) => text.replaceAll(/\s+/g, ' ');

/**
 * The template's own words around one `{{n}}`.
 *
 * A row labelled only "Value {{2}}" tells the operator nothing about what
 * belongs in it; the sentence it lands in does.
 */
export function paramContext(body: string, placeholder: number): string {
  const segments = templateSegments(body);
  const at = segments.findIndex((segment) => segment.placeholder === placeholder);
  if (at < 0) return '';
  const before = oneLine(segments[at - 1]?.text ?? '').slice(-CONTEXT_CHARS);
  const after = oneLine(segments[at + 1]?.text ?? '').slice(0, CONTEXT_CHARS);
  return `…${before}${segments[at].text}${after}…`;
}

/**
 * A CTA link as it will open, with the operator's value in place of its {{n}}.
 *
 * An empty value leaves the placeholder visible on purpose — a link that still
 * reads `{{7}}` is the exact thing this field exists to stop, so it has to be
 * legible rather than silently blanked.
 */
export function filledButtonUrl(url: string, param: number, value: string): string {
  if (!value || param < 1) return url;
  const params = Array.from({ length: param }, (_, index) =>
    index === param - 1 ? value : `{{${index + 1}}}`
  );
  return renderTemplateBody(url, params);
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
