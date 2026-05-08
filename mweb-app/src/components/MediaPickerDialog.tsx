import { useEffect, useMemo, useRef, useState } from 'react';
import { gql, useApolloClient, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  InputAdornment,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';

const UPLOAD_IMAGE = gql`
  mutation UploadImageToImagekit(
    $fileBase64: String!
    $fileName: String!
    $mimeType: String
    $folder: String
  ) {
    uploadImageToImagekit(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      folder: $folder
    ) {
      url
      fileId
    }
  }
`;

const PEXELS_SEARCH = gql`
  query PexelsSearch($query: String, $page: Int, $perPage: Int, $orientation: String) {
    pexelsSearch(query: $query, page: $page, perPage: $perPage, orientation: $orientation) {
      page
      next_page
      photos {
        id
        photographer
        photographer_url
        avg_color
        alt
        src_large
        src_medium
        src_tiny
      }
    }
  }
`;

const IMPORT_REMOTE = gql`
  mutation ImportRemoteImage($remoteUrl: String!, $folder: String) {
    importRemoteImageToImagekit(remoteUrl: $remoteUrl, folder: $folder) {
      url
      fileId
    }
  }
`;

const PEXELS_VIDEO_SEARCH = gql`
  query PexelsVideoSearch($query: String, $page: Int, $perPage: Int, $orientation: String) {
    pexelsSearchVideos(query: $query, page: $page, perPage: $perPage, orientation: $orientation) {
      page
      next_page
      videos {
        id
        width
        height
        duration
        preview
        image
        user_name
        video_files {
          id
          quality
          width
          height
          link
        }
      }
    }
  }
`;

const IMPORT_REMOTE_MEDIA = gql`
  mutation ImportRemoteMedia($remoteUrl: String!, $folder: String) {
    importRemoteMediaToImagekit(remoteUrl: $remoteUrl, folder: $folder) {
      url
      fileId
    }
  }
`;

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPicked: (url: string) => void;
  /** ImageKit folder e.g. "/users", "/posts", "/branding" */
  folder?: string;
  title?: string;
  /** Comma-separated mime list. Defaults to images and videos. */
  accept?: string;
}

export default function MediaPickerDialog({
  open,
  onClose,
  onPicked,
  folder = '/uploads',
  title = 'Select media',
  accept = 'image/*,video/*',
}: MediaPickerDialogProps) {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Device upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  // Pexels state
  const [pquery, setPquery] = useState('');
  const [porientation, setPorientation] = useState<'landscape' | 'portrait' | 'square' | ''>('');
  const [psearching, setPsearching] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Pexels video state
  const [vquery, setVquery] = useState('');
  const [vorientation, setVorientation] = useState<'landscape' | 'portrait' | 'square' | ''>('');
  const [vsearching, setVsearching] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [vpage, setVpage] = useState(1);
  const [vhasMore, setVhasMore] = useState(false);
  const [vimportingId, setVimportingId] = useState<string | null>(null);

  const client = useApolloClient();
  const [uploadImageMut] = useMutation(UPLOAD_IMAGE);
  const [importMut] = useMutation(IMPORT_REMOTE);
  const [importMediaMut] = useMutation(IMPORT_REMOTE_MEDIA);

  const allowImage = useMemo(() => /image\//.test(accept) || accept === '*', [accept]);
  const allowVideo = useMemo(() => /video\//.test(accept) || accept === '*', [accept]);

  // Reset every time the dialog opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    setPicked(null);
    setPreviewUrl(null);
    setUploadPct(null);
    setUploading(false);
  }, [open]);

  // Generate object-URL preview
  useEffect(() => {
    if (!picked) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(picked);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [picked]);

  // Auto-load curated Pexels photos when the tab opens
  useEffect(() => {
    if (open && tab === 1 && allowImage && photos.length === 0) {
      void runPexels(pquery, 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  // Auto-load curated Pexels videos when the video tab opens
  useEffect(() => {
    if (open && tab === 2 && allowVideo && videos.length === 0) {
      void runPexelsVideos(vquery, 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  // Re-run Pexels search when orientation filter changes
  useEffect(() => {
    if (open && tab === 1 && allowImage) {
      void runPexels(pquery, 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [porientation]);

  useEffect(() => {
    if (open && tab === 2 && allowVideo) {
      void runPexelsVideos(vquery, 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vorientation]);

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

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isImage = f.type.startsWith('image/');
    const isVideo = f.type.startsWith('video/');
    if (!isImage && !isVideo) {
      setError('Please choose an image or video file');
      return;
    }
    const maxBytes = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
    if (f.size > maxBytes) {
      setError(
        isVideo ? 'Video is too large (max 100 MB)' : 'Image is too large (max 15 MB)'
      );
      return;
    }
    setError(null);
    setPicked(f);
  };

  const uploadFromDevice = async () => {
    if (!picked) return;
    setUploading(true);
    setUploadPct(10);
    setError(null);
    try {
      const fileBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Could not read selected file'));
        reader.readAsDataURL(picked);
      });
      setUploadPct(55);
      const res = await uploadImageMut({
        variables: {
          fileBase64,
          fileName: picked.name,
          mimeType: picked.type,
          folder,
        },
      });
      const url = res.data?.uploadImageToImagekit?.url;
      if (!url) throw new Error('No URL returned from ImageKit upload');
      setUploadPct(100);
      onPicked(url);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setUploadPct(null);
    }
  };

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

  const pickBestVideoFile = (v: any) => {
    const files = (v.video_files || []) as any[];
    if (!files.length) return null;
    const sorted = [...files].sort((a, b) => {
      const aHd = a.quality === 'hd' ? 1 : 0;
      const bHd = b.quality === 'hd' ? 1 : 0;
      if (aHd !== bHd) return bHd - aHd;
      return (b.width || 0) - (a.width || 0);
    });
    // Prefer something around 720p / 1080p — not the biggest 4K original
    const reasonable = sorted.find((f) => (f.height || 0) <= 1080) || sorted[0];
    return reasonable;
  };

  const importPexelsVideo = async (v: any) => {
    const file = pickBestVideoFile(v);
    if (!file?.link) {
      setError('This video has no downloadable mp4');
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

  return (
    <Dialog open={open} onClose={uploading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        <IconButton
          onClick={onClose}
          disabled={uploading}
          sx={{ position: 'absolute', right: 8, top: 8 }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Upload from device" />
        <Tab label="Pexels photos" disabled={!allowImage} />
        <Tab label="Pexels videos" disabled={!allowVideo} />
      </Tabs>
      <DialogContent dividers sx={{ minHeight: 380 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {tab === 0 && (
          <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={onPickFile}
              hidden
            />
            {previewUrl ? (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: 480,
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: 'action.hover',
                }}
              >
                {picked?.type.startsWith('video/') ? (
                  <video
                    src={previewUrl}
                    controls
                    style={{
                      width: '100%',
                      display: 'block',
                      maxHeight: 360,
                      objectFit: 'contain',
                      background: '#000',
                    }}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="preview"
                    style={{
                      width: '100%',
                      display: 'block',
                      maxHeight: 360,
                      objectFit: 'contain',
                    }}
                  />
                )}
              </Box>
            ) : (
              <Box
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 6,
                  width: '100%',
                  maxWidth: 480,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <CloudUploadIcon color="primary" sx={{ fontSize: 48 }} />
                <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>
                  Click to choose an image
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PNG, JPG, WebP, GIF · max 15 MB · uploads to ImageKit
                </Typography>
              </Box>
            )}
            {picked && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {picked.name} · {(picked.size / 1024).toFixed(0)} KB
                </Typography>
                <Button
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Change
                </Button>
              </Stack>
            )}
            {uploadPct !== null && (
              <Box sx={{ width: '100%', maxWidth: 480 }}>
                <LinearProgress variant="determinate" value={uploadPct} />
                <Typography variant="caption" color="text.secondary">
                  Uploading… {uploadPct}%
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {tab === 1 && (
          <Box>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ mb: 2 }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search Pexels (e.g. coffee, sunset, basketball)…"
                value={pquery}
                onChange={(e) => setPquery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runPexels(pquery, 1, false);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={() => runPexels(pquery, 1, false)}
                sx={{ width: { xs: '100%', sm: 'auto' }, flexShrink: 0 }}
              >
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
            ) : photos.length === 0 ? (
              <Alert severity="info">No results — try a different query.</Alert>
            ) : (
              <ImageList cols={2} sx={{ gridTemplateColumns: { xs: 'repeat(2, 1fr) !important', sm: 'repeat(3, 1fr) !important' } }} gap={8} rowHeight={140}>
                {photos.map((p: any) => {
                  const isImporting = importingId === p.id;
                  return (
                    <ImageListItem
                      key={p.id}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        overflow: 'hidden',
                        opacity: importingId && !isImporting ? 0.5 : 1,
                        position: 'relative',
                        '&:hover img': { transform: 'scale(1.04)' },
                      }}
                      onClick={() => !importingId && importPexels(p)}
                    >
                      <img
                        src={p.src_medium}
                        alt={p.alt || p.photographer}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform .2s ease',
                          background: p.avg_color || '#eee',
                        }}
                      />
                      <ImageListItemBar
                        title={p.photographer}
                        subtitle="Pexels"
                        sx={{ background: 'linear-gradient(rgba(0,0,0,.6), transparent)' }}
                      />
                      {isImporting && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: 'rgba(0,0,0,.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            flexDirection: 'column',
                            gap: 1,
                          }}
                        >
                          <CircularProgress size={28} sx={{ color: 'white' }} />
                          <Typography variant="caption">Importing…</Typography>
                        </Box>
                      )}
                    </ImageListItem>
                  );
                })}
              </ImageList>
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
              . Selected images are imported into your ImageKit account.
            </Typography>
          </Box>
        )}

        {tab === 2 && (
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
                onChange={(_e, v) => setVorientation(v ?? '')}
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
            {vsearching && videos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : videos.length === 0 ? (
              <Alert severity="info">No videos — try a different query.</Alert>
            ) : (
              <ImageList
                cols={2}
                sx={{
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr) !important',
                    sm: 'repeat(3, 1fr) !important',
                  },
                }}
                gap={8}
                rowHeight={160}
              >
                {videos.map((v: any) => {
                  const isImporting = vimportingId === v.id;
                  return (
                    <ImageListItem
                      key={v.id}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        overflow: 'hidden',
                        opacity: vimportingId && !isImporting ? 0.5 : 1,
                        position: 'relative',
                      }}
                      onClick={() => !vimportingId && importPexelsVideo(v)}
                    >
                      {(() => {
                        const best = pickBestVideoFile(v);
                        return best?.link ? (
                          <video
                            src={best.link}
                            poster={v.image}
                            autoPlay
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              background: '#000',
                            }}
                          />
                        ) : (
                          <img
                            src={v.preview || v.image}
                            alt={v.user_name}
                            loading="lazy"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              background: '#000',
                            }}
                          />
                        );
                      })()}
                      <ImageListItemBar
                        title={v.user_name || 'Pexels'}
                        subtitle={`${v.duration}s · ${v.width}×${v.height}`}
                        sx={{ background: 'linear-gradient(rgba(0,0,0,.6), transparent)' }}
                      />
                      {isImporting && (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            bgcolor: 'rgba(0,0,0,.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            flexDirection: 'column',
                            gap: 1,
                          }}
                        >
                          <CircularProgress size={28} sx={{ color: 'white' }} />
                          <Typography variant="caption">Importing…</Typography>
                        </Box>
                      )}
                    </ImageListItem>
                  );
                })}
              </ImageList>
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
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        {tab === 0 && (
          <Button
            variant="contained"
            disabled={!picked || uploading}
            onClick={uploadFromDevice}
            startIcon={uploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          >
            {uploading ? 'Uploading…' : 'Upload to ImageKit'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
