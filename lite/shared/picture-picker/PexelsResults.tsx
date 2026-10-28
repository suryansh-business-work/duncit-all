import { useMemo } from 'react';
import { Alert, Box, CircularProgress, Link, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useCommonT } from '../i18n';
import type { PictureOrientation } from './picture.graphql';
import type { PictureTile } from './picture.types';
import { PhotoGrid } from './PhotoGrid';
import { usePexelsPhotos } from './usePexelsPhotos';

/** Pexels asks for a visible link back wherever its photos are listed. */
const PEXELS_HOME = 'https://www.pexels.com';

interface PexelsResultsProps {
  /** '' lists the curated picks; anything else is searched. */
  query: string;
  orientation: PictureOrientation | null;
  busyId: string | null;
  onPick: (tile: PictureTile) => void;
}

/** One Pexels list: its pages, the empty and failed states, and the credit. */
export function PexelsResults({ query, orientation, busyId, onPick }: Readonly<PexelsResultsProps>) {
  const { t } = useCommonT();
  const { photos, loading, error, hasMore, loadMore, retry } = usePexelsPhotos(query, orientation);
  const tiles = useMemo<PictureTile[]>(
    () =>
      photos.map((photo) => ({
        id: photo.id,
        src: photo.thumb_url,
        alt: photo.alt || t('lite.picture.photoBy', { vars: { name: photo.photographer } }),
        color: photo.avg_color,
        caption: photo.photographer,
      })),
    [photos, t],
  );

  return (
    <Stack spacing={2} aria-busy={loading} data-testid="picture-pexels">
      {tiles.length > 0 ? <PhotoGrid tiles={tiles} onPick={onPick} busyId={busyId} testId="picture-photos" /> : null}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
          <CircularProgress size={28} aria-label={t('lite.common.loading')} />
        </Box>
      ) : null}
      {error ? (
        <Alert
          severity="error"
          action={
            <DuncitButton color="inherit" size="small" onClick={retry} data-testid="picture-retry">
              {t('lite.common.retry')}
            </DuncitButton>
          }
        >
          {parseApiError(error, t('lite.common.loadFailed'))}
        </Alert>
      ) : null}
      {!loading && !error && tiles.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }} data-testid="picture-empty">
          {t('lite.picture.empty')}
        </Typography>
      ) : null}
      {hasMore && !loading && !error ? (
        <DuncitButton variant="outlined" onClick={loadMore} sx={{ alignSelf: 'center' }} data-testid="picture-load-more">
          {t('lite.picture.loadMore')}
        </DuncitButton>
      ) : null}
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        <Link href={PEXELS_HOME} target="_blank" rel="noopener noreferrer" color="inherit">
          {t('lite.picture.pexelsCredit')}
        </Link>
      </Typography>
    </Stack>
  );
}
