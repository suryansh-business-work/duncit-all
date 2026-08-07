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
import type { Orientation } from './types';

interface Props {
  active: boolean;
  open: boolean;
  folder: string;
  /** What to search before the user types — the pod's sub-category, say. */
  seedQuery?: string;
  /** Orientation to start on. A cover is wide, so callers pass 'landscape'. */
  defaultOrientation?: Orientation;
  /** Keep picking instead of closing on the first one. */
  multi?: boolean;
  /** The tray is full — every unpicked card stops responding. */
  atLimit?: boolean;
  onPicked: (url: string) => void;
  onClose: () => void;
  setError: (msg: string | null) => void;
}

export default function PexelsPhotosTab({
  active,
  open,
  folder,
  seedQuery,
  defaultOrientation,
  multi,
  atLimit,
  onPicked,
  onClose,
  setError,
}: Readonly<Props>) {
  const [pquery, setPquery] = useState(seedQuery ?? '');
  const [porientation, setPorientation] = useState<Orientation>(defaultOrientation ?? '');
  // Which cards are already in the tray. Pexels ids, not ImageKit URLs — the
  // card only knows the photo it rendered, and the import happens after.
  const [pickedIds, setPickedIds] = useState<string[]>([]);
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
    if (!open) {
      setPickedIds([]);
      return;
    }
    if (active && photos.length === 0) {
      runPexels(pquery, 1, false).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  // The seed arrives with the dialog, and can change between opens when the
  // host goes back a step and picks a different sub-category.
  useEffect(() => {
    if (!open) return;
    const next = seedQuery ?? '';
    setPquery(next);
    if (active) runPexels(next, 1, false).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQuery, open]);

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
      if (multi) setPickedIds((current) => [...current, String(photo.id)]);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImportingId(null);
    }
  };

  const resultsContent =
    photos.length === 0 ? (
      <Alert severity="info">No results — try a different query.</Alert>
    ) : (
      <ImageList cols={3} gap={8} rowHeight={160}>
        {photos.map((p: any) => (
          <PexelsPhotoCard
            key={p.id}
            photo={p}
            importing={importingId === p.id}
            picked={pickedIds.includes(String(p.id))}
            // A full tray freezes the unpicked cards rather than letting a tap
            // do nothing and read as a broken grid.
            anyImporting={!!importingId || (!!atLimit && !pickedIds.includes(String(p.id)))}
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
        resultsContent
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
        </a>. Selected images are imported into your ImageKit account.
      </Typography>
    </Box>
  );
}
