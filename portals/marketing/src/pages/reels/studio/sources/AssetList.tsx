import { List, ListItem, ListItemText, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation, type Translate } from '@duncit/shell';
import { formatReelDuration } from '../../format';
import type { ReelAsset, ReelAssetKind } from '../../types';
import MediaThumb from '../MediaThumb';

interface Props {
  assets: readonly ReelAsset[];
  /** Asset ids the edit currently uses — removing one of these changes the reel. */
  usedAssetIds: ReadonlySet<string>;
  onRemove: (assetId: string) => Promise<void>;
}

/** The kind's name, written out as literal keys so the translation gate can see each one. */
function kindLabel(kind: ReelAssetKind, t: Translate): string {
  if (kind === 'VIDEO') return t('ai.reels.sources.kindVideo');
  if (kind === 'AUDIO') return t('ai.reels.sources.kindAudio');
  return t('ai.reels.sources.kindImage');
}

function assetMeta(asset: ReelAsset, t: Translate): string {
  const parts = [kindLabel(asset.kind, t)];
  if (asset.duration_ms > 0) parts.push(formatReelDuration(asset.duration_ms));
  if (asset.source === 'UPLOAD') parts.push(t('ai.reels.sources.fromChat'));
  return parts.join(' · ');
}

const TEXT_SLOTS = { primary: { noWrap: true, variant: 'body2' }, secondary: { noWrap: true, variant: 'caption' } } as const;

/** The footage this reel holds — what the editor is allowed to cut from. */
export default function AssetList({ assets, usedAssetIds, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();

  // Footage the edit is using takes scenes with it, so that removal asks first.
  const remove = async (asset: ReelAsset) => {
    if (usedAssetIds.has(asset.id)) {
      const ok = await confirm({
        title: t('ai.reels.sources.removeTitle'),
        message: t('ai.reels.sources.removeMessage', { vars: { name: asset.name } }),
        confirmLabel: t('ai.reels.sources.remove'),
        destructive: true,
      });
      if (!ok) return;
    }
    await onRemove(asset.id);
  };

  if (assets.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', px: 2, py: 1.5 }} data-testid="reel-assets-empty">
        {t('ai.reels.sources.assetsEmpty')}
      </Typography>
    );
  }

  return (
    <List dense disablePadding aria-label={t('ai.reels.sources.assetsLabel')} data-testid="reel-assets">
      {assets.map((asset) => {
        const removeLabel = t('ai.reels.sources.removeFile', { vars: { name: asset.name } });
        return (
          <ListItem
            key={asset.id}
            sx={{ gap: 1.5, py: 0.75, pr: 7 }}
            data-testid={`reel-asset-${asset.id}`}
            secondaryAction={
              <Tooltip title={t('ai.reels.sources.remove')}>
                <span>
                  <DuncitIconButton size="small" aria-label={removeLabel} onClick={() => remove(asset)} data-testid={`reel-asset-remove-${asset.id}`}>
                    <CloseIcon fontSize="small" />
                  </DuncitIconButton>
                </span>
              </Tooltip>
            }
          >
            <MediaThumb kind={asset.kind} src={asset.thumbnail_url} />
            <ListItemText primary={asset.name} secondary={assetMeta(asset, t)} slotProps={TEXT_SLOTS} />
          </ListItem>
        );
      })}
    </List>
  );
}
