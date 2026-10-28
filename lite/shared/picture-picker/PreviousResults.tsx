import { Alert, Stack, Typography } from '@mui/material';
import { useCommonT } from '../i18n';
import type { PictureTile } from './picture.types';
import { PhotoGrid } from './PhotoGrid';

interface PreviousResultsProps {
  covers: readonly string[];
  /** Off: say why only uploads and earlier covers are on offer. */
  stockReady: boolean;
  busyId: string | null;
  onPick: (url: string) => void;
}

/** The covers of events this person hosted, to use again as they are. */
export function PreviousResults({ covers, stockReady, busyId, onPick }: Readonly<PreviousResultsProps>) {
  const { t } = useCommonT();
  const tiles: PictureTile[] = covers.map((url) => ({ id: url, src: url, alt: t('lite.picture.previousAlt') }));
  return (
    <Stack spacing={2}>
      {stockReady ? null : <Alert severity="info">{t('lite.picture.stockOff')}</Alert>}
      {tiles.length > 0 ? (
        <PhotoGrid tiles={tiles} onPick={(tile) => onPick(tile.src)} busyId={busyId} testId="picture-previous" />
      ) : (
        <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }} data-testid="picture-previous-empty">
          {t('lite.picture.previousEmpty')}
        </Typography>
      )}
    </Stack>
  );
}
