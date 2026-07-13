import { useEffect, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  ImageList,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { IMPORT_REMOTE, PEXELS_SEARCH } from './queries';
import PexelsPhotoCard from './PexelsPhotoCard';

interface Props {
  active: boolean;
  open: boolean;
  folder: string;
  onPicked: (url: string) => void;
  onClose: () => void;
  setError: (msg: string | null) => void;
}

export default function PexelsPhotosTab({
  active,
  open,
  folder,
  onPicked,
  onClose,
  setError,
}: Readonly<Props>) {
  const [pquery, setPquery] = useState('');
  const [porientation, setPorientation] = useState<'landscape' | 'portrait' | 'square' | ''>('');
  const [psearching, setPsearching] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const client = useApolloClient();
  const [importMut] = useMutation(IMPORT_REMOTE);

  const runPexels = async (q: string, p: number, append: boolean) => {
    setPsearching(true);
    setError(null);
    try {
      const res = await client.query({
        query: PEXELS_SEARCH,
        variables: { query: q || null, page: p, perPage: 24, orientation: porientation || null },
        fetchPolicy: 'network-only',
      });
      const data = res.data?.pexelsSearch;
      const next = data?.photos ?? [];
      setPhotos(append ? [...photos, ...next] : next);
      setPage(p);
      setHasMore(!!data?.next_page);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPsearching(false);
    }
  };

  useEffect(() => {
    if (open && active && photos.length === 0) {
      runPexels(pquery, 1, false).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  useEffect(() => {
    if (open && active) {
      runPexels(pquery, 1, false).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porientation]);

  const importPexels = async (photo: any) => {
    setImportingId(photo.id);
    setError(null);
    try {
      const remote = photo.src_large || photo.src_medium;
      const res = await importMut({
        variables: { remoteUrl: remote, folder },
      });
      const url = res.data?.importRemoteImageToImagekit?.url;
      if (!url) throw new Error('No URL returned from server');
      onPicked(url);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImportingId(null);
    }
  };

  const resultsView =
    photos.length === 0 ? (
      <Alert severity="info">No results — try a different query.</Alert>
    ) : (
      <ImageList cols={3} gap={8} rowHeight={160}>
        {photos.map((p: any) => (
          <PexelsPhotoCard
            key={p.id}
            photo={p}
            importing={importingId === p.id}
            anyImporting={!!importingId}
            onPick={importPexels}
          />
        ))}
      </ImageList>
    );

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search Pexels (e.g. coffee, sunset, basketball)…"
          value={pquery}
          onChange={(e) => setPquery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runPexels(pquery, 1, false).catch(console.error);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="contained" onClick={() => runPexels(pquery, 1, false)}>
          Search
        </Button>
      </Stack>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={porientation}
        onChange={(_e, v) => setPorientation(v ?? '')}
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        <ToggleButton value="">All</ToggleButton>
        <ToggleButton value="landscape">Landscape</ToggleButton>
        <ToggleButton value="portrait">Portrait</ToggleButton>
        <ToggleButton value="square">Square</ToggleButton>
      </ToggleButtonGroup>
      {psearching && photos.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        resultsView
      )}
      {hasMore && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            onClick={() => runPexels(pquery, page + 1, true)}
            disabled={psearching}
            startIcon={psearching ? <CircularProgress size={14} /> : null}
          >
            Load more
          </Button>
        </Box>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 2, textAlign: 'center' }}
      >
        Photos provided by{' '}
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          Pexels
        </a>
        {'. Selected images are imported into your ImageKit account.'}
      </Typography>
    </Box>
  );
}
