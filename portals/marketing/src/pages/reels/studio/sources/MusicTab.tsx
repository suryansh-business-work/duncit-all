import { useMemo, useState, type FormEvent } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ReelProject } from '../../types';
import type { ReelActions } from '../useReelActions';
import MusicTrackRow from './MusicTrackRow';
import { ShelfMore, ShelfSearchField, ShelfStatus } from './ShelfParts';
import { heldIdOf, heldIds, toStockInput } from './StockTab';
import { useStockSearch } from './useStockSearch';

interface Props {
  project: ReelProject;
  actions: ReelActions;
}

/**
 * Music for the reel, from Jamendo. The server lists only tracks whose
 * Creative Commons licence allows a marketing reel — commercial use, cut to
 * length — and a picked track is copied into the media store with its
 * licence and the credit it asks for. Once added it is laid under the reel
 * from the timeline's Music track, like any other sound file.
 */
export default function MusicTab({ project, actions }: Readonly<Props>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const search = useStockSearch(project.spec.aspect, 'JAMENDO');
  const held = useMemo(() => heldIds(project.assets), [project.assets]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    search.run(query, 'AUDIO');
  };

  return (
    <Stack sx={{ minHeight: 0, flex: 1 }} data-testid="reel-music-tab">
      <Stack component="form" spacing={1} noValidate onSubmit={submit} sx={{ px: 1.5, pt: 1, pb: 1 }} data-testid="reel-music-form">
        <ShelfSearchField
          value={query}
          onChange={setQuery}
          label={t('ai.reels.music.searchLabel')}
          placeholder={t('ai.reels.music.searchPlaceholder')}
          testId="reel-music-query"
        />
        <DuncitButton
          type="submit"
          size="small"
          variant="contained"
          disabled={query.trim() === '' || search.loading}
          sx={{ alignSelf: 'flex-start' }}
          data-testid="reel-music-search"
        >
          {t('ai.reels.stock.search')}
        </DuncitButton>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('ai.reels.music.hint')}
        </Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, pb: 1.5 }}>
        <ShelfStatus search={search} failedText={t('ai.reels.music.searchFailed')} emptyText={t('ai.reels.music.empty')} prefix="reel-music" />
        {search.items.length > 0 && (
          <Box component="ul" aria-label={t('ai.reels.music.resultsLabel')} sx={{ m: 0, p: 0 }} data-testid="reel-music-results">
            {search.items.map((track) => (
              <MusicTrackRow
                key={track.id}
                track={track}
                added={held.has(heldIdOf(track))}
                busy={actions.addingStock}
                onAdd={(picked) => actions.addStockItems([toStockInput(picked)])}
              />
            ))}
          </Box>
        )}
        <ShelfMore search={search} prefix="reel-music" />
      </Box>
    </Stack>
  );
}
