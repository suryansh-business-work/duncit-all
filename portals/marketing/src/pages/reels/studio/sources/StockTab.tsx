import { useMemo, useState, type FormEvent } from 'react';
import { Box, ImageList, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ReelAsset, ReelProject, ReelStockInput, ReelStockItem, ReelStockProvider } from '../../types';
import type { ReelActions } from '../useReelActions';
import { ShelfMore, ShelfSearchField, ShelfStatus } from './ShelfParts';
import StockCard from './StockCard';
import { useStockSearch, type StockKind } from './useStockSearch';

/** The footage libraries; Jamendo's music has a shelf of its own. */
export type FootageProvider = Extract<ReelStockProvider, 'PEXELS' | 'PIXABAY'>;

interface Props {
  project: ReelProject;
  actions: ReelActions;
  /** Which library this shelf searches. */
  provider?: FootageProvider;
}

/**
 * The id the reel keeps a library file under. Pexels ids stay bare, as every
 * older reel holds them; Pixabay and Jamendo ids carry their library's name,
 * so the same number from two libraries is never mistaken for one file.
 */
export const heldIdOf = (item: Pick<ReelStockItem, 'provider' | 'provider_id'>): string =>
  item.provider === 'PEXELS' ? item.provider_id : `${item.provider.toLowerCase()}:${item.provider_id}`;

/** The library files a reel already holds, by the id each is kept under. */
export const heldIds = (assets: readonly ReelAsset[]): Set<string> =>
  new Set(assets.map((asset) => asset.provider_id).filter((id) => id !== ''));

/** A stock file as the reel takes it: named by its credit, or its provider id when there is none. */
export const toStockInput = (item: ReelStockItem): ReelStockInput => ({
  provider_id: item.provider_id,
  kind: item.kind,
  url: item.url,
  preview_url: item.preview_url,
  name: item.attribution || item.provider_id,
  width: item.width,
  height: item.height,
  duration_ms: item.duration_ms,
  licence: item.licence,
  attribution: item.attribution,
  provider: item.provider,
});

/**
 * Stock footage from one library, searched in the reel's own orientation.
 * Every card carries its licence line, because a stock file is somebody else's
 * work and the credit travels with it into the reel; the shelf names its
 * library too, as Pixabay asks wherever its results are shown.
 */
export default function StockTab({ project, actions, provider = 'PEXELS' }: Readonly<Props>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<StockKind>('VIDEO');
  const search = useStockSearch(project.spec.aspect, provider);
  const held = useMemo(() => heldIds(project.assets), [project.assets]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    search.run(query, kind);
  };

  return (
    <Stack sx={{ minHeight: 0, flex: 1 }} data-testid="reel-stock-tab" data-provider={provider}>
      <Stack component="form" spacing={1} noValidate onSubmit={submit} sx={{ px: 1.5, pt: 1, pb: 1 }} data-testid="reel-stock-form">
        <ShelfSearchField
          value={query}
          onChange={setQuery}
          label={t('ai.reels.stock.searchLabel')}
          placeholder={t('ai.reels.stock.searchPlaceholder')}
          testId="reel-stock-query"
        />
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <ToggleButtonGroup size="small" exclusive value={kind} onChange={(_event, next: StockKind | null) => next && setKind(next)} aria-label={t('ai.reels.stock.kindLabel')}>
            <ToggleButton value="VIDEO" data-testid="reel-stock-kind-video">
              {t('ai.reels.stock.kindVideos')}
            </ToggleButton>
            <ToggleButton value="IMAGE" data-testid="reel-stock-kind-image">
              {t('ai.reels.stock.kindPhotos')}
            </ToggleButton>
          </ToggleButtonGroup>
          <DuncitButton type="submit" size="small" variant="contained" disabled={query.trim() === '' || search.loading} data-testid="reel-stock-search">
            {t('ai.reels.stock.search')}
          </DuncitButton>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('ai.reels.stock.orientationHint')} {provider === 'PIXABAY' ? t('ai.reels.stock.fromPixabay') : t('ai.reels.stock.fromPexels')}
        </Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, pb: 1.5 }}>
        <ShelfStatus search={search} failedText={t('ai.reels.stock.searchFailed')} emptyText={t('ai.reels.stock.empty')} prefix="reel-stock" />
        {search.items.length > 0 && (
          <ImageList cols={2} gap={8} sx={{ m: 0 }} aria-label={t('ai.reels.stock.resultsLabel')} data-testid="reel-stock-results">
            {search.items.map((item) => (
              <StockCard key={item.id} item={item} added={held.has(heldIdOf(item))} busy={actions.addingStock} onAdd={(picked) => actions.addStockItems([toStockInput(picked)])} />
            ))}
          </ImageList>
        )}
        <ShelfMore search={search} prefix="reel-stock" />
      </Box>
    </Stack>
  );
}
