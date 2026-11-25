import { CRM_EMAIL_BRAND_GROUPS } from '@duncit/utils';

import type { SheetAction } from '@/components/email-templates/ActionSheet';
import type { BrandAsset, BrandAssetKind } from '@/features/email-templates/useEmailSettings';

type Translate = (key: string) => string;

export interface BrandActionHandlers {
  preview: (asset: BrandAsset) => void;
  toggleLogo: (asset: BrandAsset) => void;
  replace: (asset: BrandAsset) => void;
  rename: (asset: BrandAsset) => void;
  refile: (asset: BrandAsset, kind: BrandAssetKind) => void;
  remove: (asset: BrandAsset) => void;
}

/**
 * A brand image's menu, as the portal's tile menu: preview; for a logo, use it
 * as the email logo (or go back to the Duncit logo); replace the file, rename,
 * move to another shelf, delete.
 */
export function brandActions(
  t: Translate,
  asset: BrandAsset,
  primaryLogoId: string | null,
  busy: boolean,
  on: BrandActionHandlers,
): SheetAction[] {
  const isPrimary = asset.id === primaryLogoId;
  const logo: SheetAction[] =
    asset.kind === 'LOGO'
      ? [
          {
            key: 'logo',
            label: isPrimary
              ? t('crm.emailSettings.useDuncitLogo')
              : t('crm.emailSettings.useAsEmailLogo'),
            icon: isPrimary ? 'star-border' : 'star',
            onPress: () => on.toggleLogo(asset),
            disabled: busy,
          },
        ]
      : [];
  const moves: SheetAction[] = CRM_EMAIL_BRAND_GROUPS.filter((g) => g.kind !== asset.kind).map(
    (g) => ({
      key: `move-${g.kind}`,
      label: t(g.moveKey),
      icon: 'swap-horiz',
      onPress: () => on.refile(asset, g.kind),
      disabled: busy,
    }),
  );
  return [
    {
      key: 'preview',
      label: t('crm.media.preview'),
      icon: 'zoom-in',
      onPress: () => on.preview(asset),
    },
    ...logo,
    {
      key: 'replace',
      label: t('crm.media.replace'),
      icon: 'find-replace',
      onPress: () => on.replace(asset),
      disabled: busy,
    },
    {
      key: 'rename',
      label: t('crm.media.rename'),
      icon: 'drive-file-rename-outline',
      onPress: () => on.rename(asset),
      disabled: busy,
    },
    ...moves,
    {
      key: 'delete',
      label: t('shell.common.delete'),
      icon: 'delete-outline',
      onPress: () => on.remove(asset),
      disabled: busy,
      destructive: true,
    },
  ];
}
