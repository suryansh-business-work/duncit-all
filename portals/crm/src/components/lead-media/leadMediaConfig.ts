import type { CrmLeadMediaKind } from '../../api/leadMedia.gql';

/** What a browser previews in an <img>: raster photos plus SVG for vector logos. Matches the server. */
export const LEAD_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'] as const;

/** Per lead and kind — the server enforces the same caps. */
export const LEAD_MEDIA_LIMITS: Record<CrmLeadMediaKind, number> = { LOGO: 10, IMAGE: 50 };

export const LEAD_MEDIA_GROUPS: {
  kind: CrmLeadMediaKind;
  titleKey: string;
  hintKey: string;
  emptyKey: string;
  uploadKey: string;
  fit: 'contain' | 'cover';
}[] = [
  {
    kind: 'LOGO',
    titleKey: 'crm.media.logos',
    hintKey: 'crm.media.logosHint',
    emptyKey: 'crm.media.noLogos',
    uploadKey: 'crm.media.uploadLogos',
    fit: 'contain',
  },
  {
    kind: 'IMAGE',
    titleKey: 'crm.media.images',
    hintKey: 'crm.media.imagesHint',
    emptyKey: 'crm.media.noImages',
    uploadKey: 'crm.media.uploadImages',
    fit: 'cover',
  },
];
