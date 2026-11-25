/**
 * CRM › Email Templates: the rules the template editor runs on, shared by the
 * CRM portal and the Duncit CRM app so both derive the same slug, offer the
 * same lead variables and edit the MJML the same way.
 */

export type CrmEmailTemplateTarget = 'VENUE' | 'HOST' | 'ECOMM' | 'STATIC';

/** A lead variable a template can use as `{{ slug }}`, with its label's copy key. */
export interface CrmEmailVariableOption {
  slug: string;
  labelKey: string;
}

/** A variable declared on a template: its key, what it is for and its default value. */
export interface CrmEmailTemplateVariable {
  key: string;
  description?: string | null;
  sample?: string | null;
}

/** Venue lead fields a template can pull in at send time. */
export const CRM_EMAIL_VENUE_VARIABLES: readonly CrmEmailVariableOption[] = [
  { slug: 'venue_name', labelKey: 'crm.emailTemplates.variableLabel.venueName' },
  { slug: 'super_category', labelKey: 'crm.emailTemplates.variableLabel.superCategory' },
  { slug: 'space_type', labelKey: 'crm.emailTemplates.variableLabel.spaceType' },
  { slug: 'city', labelKey: 'crm.emailTemplates.variableLabel.city' },
  { slug: 'area', labelKey: 'crm.emailTemplates.variableLabel.area' },
  { slug: 'full_address', labelKey: 'crm.emailTemplates.variableLabel.address' },
  { slug: 'contact_name', labelKey: 'crm.emailTemplates.variableLabel.contactName' },
  { slug: 'contact_email', labelKey: 'crm.emailTemplates.variableLabel.contactEmail' },
  { slug: 'contact_mobile', labelKey: 'crm.emailTemplates.variableLabel.contactMobile' },
  { slug: 'website', labelKey: 'crm.emailTemplates.variableLabel.website' },
  { slug: 'lead_status', labelKey: 'crm.emailTemplates.variableLabel.leadStatus' },
  { slug: 'priority', labelKey: 'crm.emailTemplates.variableLabel.priority' },
];

/** Host lead fields a template can pull in at send time. */
export const CRM_EMAIL_HOST_VARIABLES: readonly CrmEmailVariableOption[] = [
  { slug: 'host_name', labelKey: 'crm.emailTemplates.variableLabel.hostName' },
  { slug: 'organization_name', labelKey: 'crm.emailTemplates.variableLabel.organization' },
  { slug: 'host_type', labelKey: 'crm.emailTemplates.variableLabel.hostType' },
  { slug: 'super_category', labelKey: 'crm.emailTemplates.variableLabel.superCategory' },
  { slug: 'city', labelKey: 'crm.emailTemplates.variableLabel.city' },
  { slug: 'area', labelKey: 'crm.emailTemplates.variableLabel.area' },
  { slug: 'contact_name', labelKey: 'crm.emailTemplates.variableLabel.contactName' },
  { slug: 'contact_email', labelKey: 'crm.emailTemplates.variableLabel.contactEmail' },
  { slug: 'contact_mobile', labelKey: 'crm.emailTemplates.variableLabel.contactMobile' },
  { slug: 'website', labelKey: 'crm.emailTemplates.variableLabel.website' },
  { slug: 'lead_status', labelKey: 'crm.emailTemplates.variableLabel.leadStatus' },
  { slug: 'priority', labelKey: 'crm.emailTemplates.variableLabel.priority' },
];

/** The variables offered for a template's audience: venue or host fields, none for ecomm and static ones. */
export function crmEmailVariablesFor(target: string): readonly CrmEmailVariableOption[] {
  if (target === 'VENUE') return CRM_EMAIL_VENUE_VARIABLES;
  if (target === 'HOST') return CRM_EMAIL_HOST_VARIABLES;
  return [];
}

/** Placeholders found in the MJML that are not variables offered for the template's audience. */
export function crmForeignEmailVariables(detected: readonly string[], target: string): string[] {
  const known = new Set(crmEmailVariablesFor(target).map((v) => v.slug));
  return detected.filter((slug) => !known.has(slug));
}

const isSlugChar = (c: string) => (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9');

/**
 * A template's stable code key from its name: lower case, every run of other
 * characters one dash, no dash at either end ("Diwali Offer 2026" →
 * "diwali-offer-2026"). Blank when the name has no letter or digit.
 */
export function crmEmailTemplateSlug(name: string): string {
  let slug = '';
  let pendingDash = false;
  for (const c of name.trim().toLowerCase()) {
    if (isSlugChar(c)) {
      if (pendingDash && slug) slug += '-';
      slug += c;
      pendingDash = false;
    } else {
      pendingDash = true;
    }
  }
  return slug;
}

/** Splice an `<mj-image>` for `url` into MJML: inside the first column, else before `</mj-body>`, else at the end. */
export function crmInsertMjmlImage(mjml: string, url: string): string {
  const tag = `      <mj-image src="${url}" alt="" />\n`;
  const colIdx = mjml.indexOf('</mj-column>');
  if (colIdx !== -1) return `${mjml.slice(0, colIdx)}${tag}    ${mjml.slice(colIdx)}`;
  const bodyIdx = mjml.indexOf('</mj-body>');
  const section = `    <mj-section><mj-column>\n${tag}    </mj-column></mj-section>\n  `;
  if (bodyIdx !== -1) return `${mjml.slice(0, bodyIdx)}${section}${mjml.slice(bodyIdx)}`;
  return `${mjml}\n${tag}`;
}

/**
 * The preview and test-send values: each declared variable's default
 * (`sample`), blank when it has none, as the JSON the render takes.
 */
export const crmEmailVarsJson = (variables: readonly CrmEmailTemplateVariable[]): string =>
  JSON.stringify(Object.fromEntries(variables.map((v) => [v.key, v.sample ?? ''])));

/** Declare every detected placeholder the template does not declare yet, keeping the declared ones as they are. */
export function crmMergeDetectedVariables<T extends CrmEmailTemplateVariable>(
  variables: readonly T[],
  detected: readonly string[],
): Array<T | { key: string }> {
  const declared = new Set(variables.map((v) => v.key));
  const added = [...new Set(detected)].filter((key) => !declared.has(key)).map((key) => ({ key }));
  return [...variables, ...added];
}

export type CrmEmailAssetKind = 'LOGO' | 'BANNER' | 'IMAGE';

/** One shelf of the CRM email brand library, with its copy keys written out. */
export interface CrmEmailBrandGroup {
  kind: CrmEmailAssetKind;
  titleKey: string;
  hintKey: string;
  emptyKey: string;
  uploadKey: string;
  moveKey: string;
  /** `contain` keeps a logo whole; `cover` fills the frame with a photo. */
  fit: 'contain' | 'cover';
}

/** Email Templates › Settings › Logos & Images: the three shelves, in order. */
export const CRM_EMAIL_BRAND_GROUPS: readonly CrmEmailBrandGroup[] = [
  {
    kind: 'LOGO',
    titleKey: 'crm.emailSettings.logos',
    hintKey: 'crm.emailSettings.logosHint',
    emptyKey: 'crm.emailSettings.noLogos',
    uploadKey: 'crm.emailSettings.uploadLogos',
    moveKey: 'crm.emailSettings.moveToLogos',
    fit: 'contain',
  },
  {
    kind: 'BANNER',
    titleKey: 'crm.emailSettings.banners',
    hintKey: 'crm.emailSettings.bannersHint',
    emptyKey: 'crm.emailSettings.noBanners',
    uploadKey: 'crm.emailSettings.uploadBanners',
    moveKey: 'crm.emailSettings.moveToBanners',
    fit: 'cover',
  },
  {
    kind: 'IMAGE',
    titleKey: 'crm.emailSettings.images',
    hintKey: 'crm.emailSettings.imagesHint',
    emptyKey: 'crm.emailSettings.noImages',
    uploadKey: 'crm.emailSettings.uploadImages',
    moveKey: 'crm.emailSettings.moveToImages',
    fit: 'cover',
  },
];

/** Image types every mail app shows — the server refuses SVG and WebP for the same reason. */
export const CRM_EMAIL_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif'] as const;
