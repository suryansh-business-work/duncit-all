import { Box, ImageListItem, ImageListItemBar, Tooltip } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation, type Translate } from '@duncit/shell';
import { formatReelDuration } from '../../format';
import type { ReelStockItem } from '../../types';

interface Props {
  item: ReelStockItem;
  /** True when the reel already holds this file. */
  added: boolean;
  busy: boolean;
  onAdd: (item: ReelStockItem) => void;
}

/** What is worth knowing before adding: the kind, how long, and who to credit under what licence. */
export function stockMeta(item: ReelStockItem, t: Translate): string {
  const parts = [item.kind === 'VIDEO' ? t('ai.reels.sources.kindVideo') : t('ai.reels.sources.kindImage')];
  if (item.duration_ms > 0) parts.push(formatReelDuration(item.duration_ms));
  if (item.width > 0 && item.height > 0) parts.push(`${item.width}×${item.height}`);
  return parts.join(' · ');
}

/** The licence line: the licence, and the credit when the provider asks for one. */
export const stockCredit = (item: Pick<ReelStockItem, 'licence' | 'attribution'>): string =>
  [item.licence, item.attribution].filter((part) => part !== '').join(' · ');

/** One stock file in the grid: its preview, what it is, its licence, and the way into the reel. */
export default function StockCard({ item, added, busy, onAdd }: Readonly<Props>) {
  const { t } = useTranslation();
  const name = item.attribution || item.provider_id;
  const addLabel = t('ai.reels.stock.addNamed', { vars: { name } });
  const action = added ? (
    <Tooltip title={t('ai.reels.sources.alreadyAdded')}>
      <CheckIcon fontSize="small" role="img" aria-label={t('ai.reels.sources.alreadyAdded')} sx={{ color: 'common.white', mx: 1 }} />
    </Tooltip>
  ) : (
    <Tooltip title={t('ai.reels.sources.add')}>
      <span>
        <DuncitIconButton size="small" aria-label={addLabel} disabled={busy} onClick={() => onAdd(item)} sx={{ color: 'common.white' }} data-testid={`reel-stock-add-${item.id}`}>
          <AddIcon fontSize="small" />
        </DuncitIconButton>
      </span>
    </Tooltip>
  );

  return (
    <ImageListItem sx={{ borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }} data-testid={`reel-stock-item-${item.id}`}>
      <Box component="img" src={item.preview_url} alt="" loading="lazy" sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
      <ImageListItemBar
        title={stockMeta(item, t)}
        subtitle={stockCredit(item)}
        actionIcon={action}
        sx={{ background: (theme: Theme) => `linear-gradient(transparent, ${alpha(theme.palette.common.black, 0.75)})` }}
      />
    </ImageListItem>
  );
}
