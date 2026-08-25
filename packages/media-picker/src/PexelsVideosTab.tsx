import { useEffect, useState } from 'react';
import { useTranslation } from './i18n/useTranslation';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  ImageList,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { IMPORT_REMOTE_MEDIA, PEXELS_VIDEO_SEARCH } from './queries';
import { pickBestVideoFile } from './utils';
import PexelsVideoCard from './PexelsVideoCard';
import type { Orientation } from './types';

interface Props {
  active: boolean;
  open: boolean;
  folder: string;
  onPicked: (url: string) => void;
  onClose: () => void;
  setError: (msg: string | null) => void;
}

export default function PexelsVideosTab({
  active,
  open,
  folder,
  onPicked,
  onClose,
  setError,
}: Readonly<Props>) {
  const { t } = useTranslation();
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
    setError(null);
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
      setError(e.message);
    } finally {
      setVsearching(false);
    }
  };

  useEffect(() => {
    if (open && active && videos.length === 0) {
      runPexelsVideos(vquery, 1, false).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  useEffect(() => {
    if (open && active) {
      runPexelsVideos(vquery, 1, false).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vorientation]);

  const importPexelsVideo = async (v: any) => {
    const file = pickBestVideoFile(v);
    if (!file?.link) {
      setError(t('media.list.noVideoFile'));
      return;
    }
    setVimportingId(v.id);
    setError(null);
    try {
      const res = await importMediaMut({
        variables: { remoteUrl: file.link, folder },
      });
      const url = res.data?.importRemoteMediaToImagekit?.url;
      if (!url) throw new Error('No URL returned from server');
      onPicked(url);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVimportingId(null);
    }
  };

  const resultsContent =
    videos.length === 0 ? (
      <Alert severity="info">{t('media.pexels.noVideos')}</Alert>
    ) : (
      <ImageList cols={3} gap={8} rowHeight={160}>
        {videos.map((v: any) => (
          <PexelsVideoCard
            key={v.id}
            video={v}
            importing={vimportingId === v.id}
            anyImporting={!!vimportingId}
            onPick={importPexelsVideo}
          />
        ))}
      </ImageList>
    );

  return (
    <Box sx={{ position: 'relative' }}>
      {/* A re-search over results already on screen changed nothing visible —
          the old photos simply sat there until new ones replaced them. */}
      {vsearching && (
        <LinearProgress sx={{ position: 'sticky', top: 0, zIndex: 2, mb: 1 }} />
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          alignItems: { sm: 'center' },
          mb: 2
        }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('media.pexels.searchVideos')}
          value={vquery}
          onChange={(e) => setVquery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runPexelsVideos(vquery, 1, false).catch(console.error);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }
          }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={vorientation}
          onChange={(_e, v) => setVorientation(v ?? '')}
        >
          <ToggleButton value="">All</ToggleButton>
          <ToggleButton value="landscape">{t('media.pexels.landscape')}</ToggleButton>
          <ToggleButton value="portrait">{t('media.pexels.portrait')}</ToggleButton>
          <ToggleButton value="square">{t('media.pexels.square')}</ToggleButton>
        </ToggleButtonGroup>
        <Button
          variant="contained" onClick={() => runPexelsVideos(vquery, 1, false)}
          disabled={vsearching}
          startIcon={vsearching ? <CircularProgress size={14} color="inherit" /> : null}
        >
          Search
        </Button>
      </Stack>
      {vsearching && videos.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        resultsContent
      )}
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
        sx={{
          color: "text.secondary",
          display: 'block',
          mt: 2,
          textAlign: 'center'
        }}>
        Videos provided by{' '}
        <a
          href="https://www.pexels.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit' }}
        >
          Pexels
        </a>.
      </Typography>
    </Box>
  );
}
