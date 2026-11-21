import type { CrmEmailAssetKind } from '../../../api/emailSettings.gql';

/** The three shelves of the brand library, with their copy keys written out. */
export const BRAND_GROUPS: {
  kind: CrmEmailAssetKind;
  titleKey: string;
  hintKey: string;
  emptyKey: string;
  uploadKey: string;
  moveKey: string;
  fit: 'contain' | 'cover';
}[] = [
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
