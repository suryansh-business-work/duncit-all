import { Alert, Divider, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { CrmEmailBrandAsset, CrmEmailSettings } from '../../../api/emailSettings.gql';
import { useImageDialogs } from '../../../components/image-library/useImageDialogs';
import BrandAssetGroup from './BrandAssetGroup';
import { BRAND_GROUPS } from './brandGroups';
import { EMAIL_IMAGE_TYPES, useBrandAssets } from './useBrandAssets';

interface Props {
  settings: CrmEmailSettings;
}

/**
 * Settings › Logos & Images. The logo picked as the email logo replaces the
 * Duncit logo in the header of every CRM email; banners and images are handed
 * to the AI writer, which may place them in the emails it writes.
 */
export default function BrandAssetsPanel({ settings }: Readonly<Props>) {
  const { t } = useTranslation();
  const brand = useBrandAssets();
  const primaryLogoId = settings.primary_logo_id ?? null;
  const dialogs = useImageDialogs<CrmEmailBrandAsset>({
    accept: EMAIL_IMAGE_TYPES,
    busy: brand.busy,
    error: brand.actionError,
    clearError: brand.clearActionError,
    onReplace: brand.replace,
    onRename: brand.rename,
    onDelete: brand.remove,
    deleteMessage: (name) => t('crm.emailSettings.deleteAssetMessage', { vars: { name } }),
    testIdPrefix: 'brand',
  });

  const actions = {
    ...dialogs.open,
    toggleLogo: (asset: CrmEmailBrandAsset) => brand.setPrimaryLogo(asset.id === primaryLogoId ? null : asset.id),
    refile: brand.refile,
  };

  return (
    <Stack spacing={2.5}>
      <Alert severity="info">{t('crm.emailSettings.assetsIntro')}</Alert>
      {brand.uploadErrors.length > 0 && (
        <Alert severity="warning" onClose={brand.clearUploadErrors}>
          {brand.uploadErrors.map((message, index) => (
            <div key={`${index}-${message}`}>{message}</div>
          ))}
        </Alert>
      )}
      {brand.actionError && !dialogs.renaming && (
        <Alert severity="error" onClose={brand.clearActionError}>
          {brand.actionError}
        </Alert>
      )}

      {BRAND_GROUPS.map((group, index) => (
        <Stack key={group.kind} spacing={2.5}>
          {index > 0 && <Divider />}
          <BrandAssetGroup
            group={group}
            assets={settings.assets.filter((asset) => asset.kind === group.kind)}
            primaryLogoId={primaryLogoId}
            busy={brand.busy}
            onUpload={(files) => brand.add(group.kind, files)}
            actions={actions}
          />
        </Stack>
      ))}

      {dialogs.dialogs}
    </Stack>
  );
}
