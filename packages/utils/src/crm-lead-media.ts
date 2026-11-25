/**
 * Lead Details › Logos & Images: the two groups, what each may hold and how an
 * item's file is described. Shared by the CRM portal's tab and the Duncit CRM
 * app's, so both say and allow the same.
 */

export type CrmLeadMediaKind = 'LOGO' | 'IMAGE';

/** What a browser previews in an <img>: raster photos plus SVG for vector logos. Matches the server. */
export const CRM_LEAD_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'] as const;

/** Per lead and kind — the server enforces the same caps. */
export const CRM_LEAD_MEDIA_LIMITS: Readonly<Record<CrmLeadMediaKind, number>> = { LOGO: 10, IMAGE: 50 };

export interface CrmLeadMediaGroup {
  kind: CrmLeadMediaKind;
  titleKey: string;
  hintKey: string;
  emptyKey: string;
  uploadKey: string;
  /** "Move to …" — the other group. */
  moveKey: string;
  /** A logo is shown whole, an image fills its frame. */
  fit: 'contain' | 'cover';
}

export const CRM_LEAD_MEDIA_GROUPS: readonly CrmLeadMediaGroup[] = [
  {
    kind: 'LOGO',
    titleKey: 'crm.media.logos',
    hintKey: 'crm.media.logosHint',
    emptyKey: 'crm.media.noLogos',
    uploadKey: 'crm.media.uploadLogos',
    moveKey: 'crm.media.moveToImages',
    fit: 'contain',
  },
  {
    kind: 'IMAGE',
    titleKey: 'crm.media.images',
    hintKey: 'crm.media.imagesHint',
    emptyKey: 'crm.media.noImages',
    uploadKey: 'crm.media.uploadImages',
    moveKey: 'crm.media.moveToLogos',
    fit: 'cover',
  },
];

/** The group an item moves to. */
export const crmOtherMediaKind = (kind: CrmLeadMediaKind): CrmLeadMediaKind => (kind === 'LOGO' ? 'IMAGE' : 'LOGO');

/** "648 KB" / "12.4 MB" — the image library's size line. */
export function crmMediaBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export interface CrmImageMetaInput {
  mime_type?: string | null;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
}

/** "PNG · 512×512 · 24 KB" — whichever of the three are known. */
export function crmImageMeta(item: CrmImageMetaInput): string {
  const type = item.mime_type ? item.mime_type.replace('image/', '').replace('+xml', '').toUpperCase() : '';
  const size = item.width && item.height ? `${item.width}×${item.height}` : '';
  const bytes = item.size_bytes ? crmMediaBytes(item.size_bytes) : '';
  return [type, size, bytes].filter(Boolean).join(' · ');
}
