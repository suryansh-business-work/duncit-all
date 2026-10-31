import { useMemo, useState, type FormEvent } from 'react';
import { Alert, Box, ImageList, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { ReelProject, ReelStockInput, ReelStockItem } from '../../types';
import type { ReelActions } from '../useReelActions';
import StockCard from './StockCard';
import { useStockSearch, type StockKind } from './useStockSearch';

interface Props {
  project: ReelProject;
  actions: ReelActions;
}

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
});

/**
 * Stock footage, searched in the reel's own orientation. Every card carries
 * its licence line, because a stock file is somebody else's work and the
 * credit travels with it into the reel.
 */
export default function StockTab({ project, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<StockKind>('VIDEO');
  const search = useStockSearch(project.spec.aspect);
  const held = useMemo(() => new Set(project.assets.map((asset) => asset.provider_id).filter((id) => id !== '')), [project.assets]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    search.run(query, kind);
  };

  return (
    <Stack sx={{ minHeight: 0, flex: 1 }} data-testid="reel-stock-tab">
      <Stack component="form" spacing={1} noValidate onSubmit={submit} sx={{ px: 1.5, pt: 1, pb: 1 }} data-testid="reel-stock-form">
        <TextField
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          label={t('ai.reels.stock.searchLabel')}
          placeholder={t('ai.reels.stock.searchPlaceholder')}
          slotProps={{
            htmlInput: { 'data-testid': 'reel-stock-query' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
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
          {t('ai.reels.stock.orientationHint')}
        </Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, pb: 1.5 }}>
        {search.error && (
          <Alert severity="error" sx={{ mb: 1 }} data-testid="reel-stock-error">
            {parseApiError(search.error, t('ai.reels.stock.searchFailed'))}
          </Alert>
        )}
        {search.searched && !search.loading && !search.error && search.items.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }} data-testid="reel-stock-empty">
            {t('ai.reels.stock.empty')}
          </Typography>
        )}
        {search.items.length > 0 && (
          <ImageList cols={2} gap={8} sx={{ m: 0 }} aria-label={t('ai.reels.stock.resultsLabel')} data-testid="reel-stock-results">
            {search.items.map((item) => (
              <StockCard key={item.id} item={item} added={held.has(item.provider_id)} busy={actions.addingStock} onAdd={(picked) => actions.addStockItems([toStockInput(picked)])} />
            ))}
          </ImageList>
        )}
        {search.loading && <Loader variant="block" />}
        {search.hasMore && (
          <DuncitButton size="small" fullWidth onClick={search.more} sx={{ mt: 1 }} data-testid="reel-stock-more">
            {t('ai.reels.stock.more')}
          </DuncitButton>
        )}
      </Box>
    </Stack>
  );
}
