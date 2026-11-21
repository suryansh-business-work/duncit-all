import { Box, Chip, Stack, Typography } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from '@duncit/shell';
import type { CrmEmailAssetKind, CrmEmailBrandAsset } from '../../../api/emailSettings.gql';
import ImageTile, { type ImageTileAction } from '../../../components/image-library/ImageTile';
import ImageUploadButton from '../../../components/image-library/ImageUploadButton';
import ImageGrid from '../../../components/image-library/ImageGrid';
import { imageMeta } from '../../../components/image-library/imageMeta';
import { BRAND_GROUPS } from './brandGroups';
import { EMAIL_IMAGE_TYPES } from './useBrandAssets';

export interface BrandAssetActions {
  preview: (asset: CrmEmailBrandAsset) => void;
  toggleLogo: (asset: CrmEmailBrandAsset) => void;
  replace: (asset: CrmEmailBrandAsset) => void;
  rename: (asset: CrmEmailBrandAsset) => void;
  refile: (asset: CrmEmailBrandAsset, kind: CrmEmailAssetKind) => void;
  remove: (asset: CrmEmailBrandAsset) => void;
}

interface Props {
  group: (typeof BRAND_GROUPS)[number];
  assets: CrmEmailBrandAsset[];
  primaryLogoId: string | null;
  busy: boolean;
  onUpload: (files: FileList) => void;
  actions: BrandAssetActions;
}

/** One shelf of the brand library: Logos, Banners or Images. */
export default function BrandAssetGroup({ group, assets, primaryLogoId, busy, onUpload, actions }: Readonly<Props>) {
  const { t } = useTranslation();

  const tileActions = (asset: CrmEmailBrandAsset): ImageTileAction[] => {
    const isPrimary = asset.id === primaryLogoId;
    const list: ImageTileAction[] = [
      { key: 'preview', label: t('crm.media.preview'), icon: <ZoomInIcon fontSize="small" />, onClick: () => actions.preview(asset) },
    ];
    if (group.kind === 'LOGO') {
      list.push({
        key: 'logo',
        label: isPrimary ? t('crm.emailSettings.useDuncitLogo') : t('crm.emailSettings.useAsEmailLogo'),
        icon: isPrimary ? <StarBorderIcon fontSize="small" /> : <StarIcon fontSize="small" />,
        onClick: () => actions.toggleLogo(asset),
        disabled: busy,
      });
    }
    list.push(
      { key: 'replace', label: t('crm.media.replace'), icon: <FindReplaceIcon fontSize="small" />, onClick: () => actions.replace(asset), disabled: busy },
      { key: 'rename', label: t('crm.media.rename'), icon: <DriveFileRenameOutlineIcon fontSize="small" />, onClick: () => actions.rename(asset), disabled: busy },
      ...BRAND_GROUPS.filter((g) => g.kind !== group.kind).map((g) => ({
        key: `move-${g.kind}`,
        label: t(g.moveKey),
        icon: <SwapHorizIcon fontSize="small" />,
        onClick: () => actions.refile(asset, g.kind),
        disabled: busy,
      })),
      { key: 'delete', label: t('shell.common.delete'), icon: <DeleteIcon fontSize="small" />, onClick: () => actions.remove(asset), disabled: busy, destructive: true }
    );
    return list;
  };

  return (
    <Stack component="section" spacing={1.5} aria-label={t(group.titleKey)}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 800 }}>
            {t(group.titleKey)}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t(group.hintKey)}
          </Typography>
        </Box>
        <ImageUploadButton label={t(group.uploadKey)} accept={EMAIL_IMAGE_TYPES} busy={busy} onFiles={onUpload} testId={`brand-upload-${group.kind}`} />
      </Stack>
      <ImageGrid items={assets} emptyText={t(group.emptyKey)}>
        {(asset) => (
          <ImageTile
            url={asset.url}
            name={asset.name}
            meta={imageMeta(asset)}
            fit={group.fit}
            badge={
              asset.id === primaryLogoId ? (
                <Chip size="small" color="primary" icon={<StarIcon />} label={t('crm.emailSettings.emailLogo')} />
              ) : undefined
            }
            onPreview={() => actions.preview(asset)}
            actions={tileActions(asset)}
          />
        )}
      </ImageGrid>
    </Stack>
  );
}
