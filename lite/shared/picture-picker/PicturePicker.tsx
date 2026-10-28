import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useCommonT } from '../i18n';
import { DropZone } from './DropZone';
import { PexelsResults } from './PexelsResults';
import { LITE_PICTURE_OPTIONS, type LitePictureOptions, type PictureOrientation } from './picture.graphql';
import { FEATURED, PREVIOUS, SHAPES, queryOf, type PictureShape, type PictureSource } from './picture.types';
import { PreviousResults } from './PreviousResults';
import { SearchRow } from './SearchRow';
import { SourceList } from './SourceList';
import { UPLOADING, usePictureActions } from './usePictureActions';

interface PicturePickerProps {
  shape: PictureShape;
  tokenKey: string;
  onPicked: (url: string) => void;
}

/** The dialog's body: what the picker offers is read first, then the picker itself. */
export function PicturePicker({ shape, tokenKey, onPicked }: Readonly<PicturePickerProps>) {
  const { t } = useCommonT();
  const { data, error, refetch } = useQuery<{ litePictureOptions: LitePictureOptions }>(LITE_PICTURE_OPTIONS, { fetchPolicy: 'cache-and-network' });
  const options = data?.litePictureOptions;
  if (options) return <PickerBody options={options} shape={shape} tokenKey={tokenKey} onPicked={onPicked} />;
  if (!error) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label={t('lite.common.loading')} />
      </Box>
    );
  }
  const retry = () => {
    refetch().catch((err: unknown) => notifyError(parseApiError(err, t('lite.common.loadFailed'))));
  };
  return (
    <Alert
      severity="error"
      action={
        <DuncitButton color="inherit" size="small" onClick={retry} data-testid="picture-options-retry">
          {t('lite.common.retry')}
        </DuncitButton>
      }
    >
      {parseApiError(error, t('lite.common.loadFailed'))}
    </Alert>
  );
}

/** Upload from the device, or pick a stock photo or an earlier cover. */
function PickerBody({ options, shape, tokenKey, onPicked }: Readonly<PicturePickerProps & { options: LitePictureOptions }>) {
  const spec = SHAPES[shape];
  const { busyId, upload, importStock } = usePictureActions({ tokenKey, maxMb: options.max_mb, onPicked });
  const [chosen, setChosen] = useState<PictureSource | null>(null);
  const [search, setSearch] = useState('');
  const [orientation, setOrientation] = useState<PictureOrientation | null>(spec.orientation);

  const source = chosen ?? (options.pexels_ready ? FEATURED : PREVIOUS);
  const query = queryOf(source);
  const select = (next: PictureSource) => {
    setChosen(next);
    if (next.kind !== 'search') setSearch('');
  };
  const submitSearch = () => {
    const text = search.trim();
    select(text ? { kind: 'search', query: text } : FEATURED);
  };

  return (
    <Stack spacing={2} sx={{ minHeight: 0 }}>
      <DropZone ratio={spec.ratio} maxMb={options.max_mb} busy={busyId === UPLOADING} onFile={upload} testId="picture-drop" />
      {options.pexels_ready ? (
        <SearchRow value={search} onChange={setSearch} onSubmit={submitSearch} orientation={orientation} onOrientation={setOrientation} showShape={source.kind === 'topic' || source.kind === 'search'} />
      ) : null}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, minHeight: 0 }}>
        <SourceList topics={options.topics} stockReady={options.pexels_ready} selected={source} onSelect={select} />
        <Box sx={{ flexGrow: 1, minWidth: 0, maxHeight: { md: 460 }, overflowY: { md: 'auto' }, pr: { md: 0.5 } }}>
          {query === null ? (
            <PreviousResults covers={options.previous_covers} stockReady={options.pexels_ready} busyId={busyId} onPick={onPicked} />
          ) : (
            <PexelsResults query={query} orientation={orientation} busyId={busyId} onPick={(tile) => importStock(tile.id)} />
          )}
        </Box>
      </Box>
    </Stack>
  );
}
