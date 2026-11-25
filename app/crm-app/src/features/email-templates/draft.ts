import type { CrmAppEmailTemplateDetailQuery } from '@/generated/graphql/graphql';

/** One template as the editor reads it. */
export type SavedTemplate = NonNullable<CrmAppEmailTemplateDetailQuery['crmEmailTemplate']>;

/** An image or attachment, addressed by its URL. */
export interface EmailAsset {
  url: string;
  name?: string | null;
}

export interface TemplateVariable {
  key: string;
  description?: string | null;
  sample?: string | null;
}

/**
 * What the editor changes before Save. The image library is not here: an
 * upload or removal is saved at once, so it never marks the template unsaved.
 */
export interface TemplateDraft {
  name: string;
  /** Not edited here; saved back as stored, as the portal does. */
  description?: string | null;
  subject: string;
  mjml: string;
  is_active: boolean;
  variables: TemplateVariable[];
  attachments: EmailAsset[];
}

export const EMPTY_DRAFT: TemplateDraft = {
  name: '',
  subject: '',
  mjml: '',
  is_active: true,
  variables: [],
  attachments: [],
};

export const toDraft = (template: SavedTemplate): TemplateDraft => ({
  name: template.name,
  description: template.description,
  subject: template.subject,
  mjml: template.mjml,
  is_active: template.is_active,
  variables: template.variables.map(({ key, description, sample }) => ({
    key,
    description,
    sample,
  })),
  attachments: template.attachments.map(({ url, name }) => ({ url, name })),
});

/** The save mutation's input, as the portal sends it. */
export const toUpdateInput = (draft: TemplateDraft, images: readonly EmailAsset[]) => ({
  name: draft.name,
  description: draft.description,
  subject: draft.subject,
  mjml: draft.mjml,
  variables: draft.variables.map(({ key, description: about, sample }) => ({
    key,
    description: about,
    sample,
  })),
  images: images.map(({ url, name }) => ({ url, name })),
  attachments: draft.attachments.map(({ url, name }) => ({ url, name })),
  is_active: draft.is_active,
});

/** A file's display name: its own, else the last part of its URL. */
export const assetLabel = (asset: EmailAsset): string =>
  asset.name || asset.url.slice(asset.url.lastIndexOf('/') + 1);
