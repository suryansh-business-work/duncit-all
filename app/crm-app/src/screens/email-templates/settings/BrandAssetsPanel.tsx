import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import { CRM_EMAIL_BRAND_GROUPS } from '@duncit/utils';
import { fireAndForget, logs } from '@duncit/logs';

import { Notice } from '@/components/email-templates/Notice';
import type {
  EmailSettings,
  EmailSettingsState,
} from '@/features/email-templates/useEmailSettings';
import { useTranslation } from '@/hooks/useTranslation';
import { BrandAssetDialogs, type BrandDialog } from './BrandAssetDialogs';
import { BrandAssetGroup } from './BrandAssetGroup';

/**
 * Settings › Logos & Images: the logo picked as the email logo replaces the
 * Duncit logo in every CRM email's header; banners and images are offered to
 * the AI writer. Every change is saved at once.
 */
export function BrandAssetsPanel({
  settings,
  brand,
}: Readonly<{ settings: EmailSettings; brand: EmailSettingsState }>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<BrandDialog>(null);
  const primaryLogoId = settings.primary_logo_id ?? null;
  const showActionError = Boolean(brand.actionError) && open?.kind !== 'rename';

  return (
    <YStack gap="$3">
      <Notice tone="info">{t('crm.emailSettings.assetsIntro')}</Notice>
      {brand.uploadErrors.length > 0 ? (
        <Notice tone="warning" onClose={brand.clearUploadErrors} testID="brand-upload-errors">
          {brand.uploadErrors.map((message, index) => (
            <Text key={`${index}-${message}`} color="$warning">
              {message}
            </Text>
          ))}
        </Notice>
      ) : null}
      {showActionError ? (
        <Notice tone="error" onClose={brand.clearActionError} testID="brand-error">
          {brand.actionError}
        </Notice>
      ) : null}
      {CRM_EMAIL_BRAND_GROUPS.map((group) => (
        <BrandAssetGroup
          key={group.kind}
          group={group}
          assets={settings.assets.filter((asset) => asset.kind === group.kind)}
          primaryLogoId={primaryLogoId}
          busy={brand.busy}
          onUpload={() =>
            fireAndForget(
              brand.add(group.kind),
              logs.mobileApp,
              'crm-app/EmailBrandAssets',
              'upload',
            )
          }
          onPreview={(asset) => setOpen({ kind: 'preview', asset })}
          onMenu={(asset) => setOpen({ kind: 'menu', asset })}
        />
      ))}
      <BrandAssetDialogs
        open={open}
        setOpen={setOpen}
        brand={brand}
        primaryLogoId={primaryLogoId}
      />
    </YStack>
  );
}
