import { useEffect, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PexelsVideoGrid from './PexelsVideoGrid';
import { IMPORT_REMOTE_MEDIA, PEXELS_VIDEO_SEARCH } from './queries';
import { pickBestVideoFile } from './videoHelpers';
import { Orientation } from './types';

interface PexelsVideosTabProps {
  active: boolean;
  open: boolean;
  folder: string;
  onPicked: (url: string) => void;
  onClose: () => void;
  onError: (msg: string | null) => void;
}

export default function PexelsVideosTab({
  active,
  open,
  folder,
  onPicked,
  onClose,
  onError,
}: PexelsVideosTabProps) {
  const [vquery, setVquery] = useState('');
  const [vorientation, setVorientation] = useState<Orientation>('');
  const [vsearching, setVsearching] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [vpage, setVpage] = useState(1);
  const [vhasMore, setVhasMore] = useState(false);
  const [vimportingId, setVimportingId] = useState<string | null>(null);

  const client = useApolloClient();
  const [importMediaMut] = useMutation(IMPORT_REMOTE_MEDIA);

  const runPexelsVideos = async (q: string, p: number, append: boolean) => {
    setVsearching(true);
    onError(null);
    try {
      const res = await client.query({
        query: PEXELS_VIDEO_SEARCH,
        variables: { query: q || null, page: p, perPage: 24, orientation: vorientation || null },
        fetchPolicy: 'network-only',
      });
      const data = res.data?.pexelsSearchVideos;
      const next = data?.videos ?? [];
      setVideos(append ? [...videos, ...next] : next);
      setVpage(p);
      setVhasMore(!!data?.next_page);
    } catch (e: any) {
      onError(e.message);
    } finally {
      setVsearching(false);
    }
  };

  useEffect(() => {
    if (open && active && videos.length === 0) {
      void runPexelsVideos(vquery, 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  useEffect(() => {
    if (open && active) {
      void runPexelsVideos(vquery, 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vorientation]);

  const importPexelsVideo = async (v: any) => {
    const file = pickBestVideoFile(v);
    if (!file?.link) {
      onError('This video has no downloadable mp4');
      return;
    }
    setVimportingId(v.id);
    onError(null);
    try {
      const res = await importMediaMut({ variables: { remoteUrl: file.link, folder } });
      const url = res.data?.importRemoteMediaToImagekit?.url;
      if (!url) throw new Error('No URL returned from server');
      onPicked(url);
      onClose();
    } catch (e: any) {
      onError(e.message);
    } finally {
      setVimportingId(null);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ mb: 2 }}
        alignItems={{ sm: 'center' }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search Pexels videos (e.g. nature, ocean, city)…"
          value={vquery}
          onChange={(e) => setVquery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runPexelsVideos(vquery, 1, false);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={vorientation}
          onChange={(_e, v) => setVorientation((v as Orientation) ?? '')}
        >
          <ToggleButton value="">All</ToggleButton>
          <ToggleButton value="landscape">Landscape</ToggleButton>
          <ToggleButton value="portrait">Portrait</ToggleButton>
          <ToggleButton value="square">Square</ToggleButton>
        </ToggleButtonGroup>
        <Button
          variant="contained"
          onClick={() => runPexelsVideos(vquery, 1, false)}
          sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
        >
          Search
        </Button>
      </Stack>
      <PexelsVideoGrid
        videos={videos}
        searching={vsearching}
        importingId={vimportingId}
        onImport={importPexelsVideo}
      />
      {vhasMore && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button
            onClick={() => runPexelsVideos(vquery, vpage + 1, true)}
            disabled={vsearching}
            startIcon={vsearching ? <CircularProgress size={14} /> : null}
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
        Videos provided by{' '}
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          Pexels
        </a>
        . Selected videos are imported into your ImageKit account.
      </Typography>
    </Box>
  );
}
