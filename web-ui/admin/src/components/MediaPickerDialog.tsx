import { useEffect, useRef, useState } from 'react';
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
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';

const IMAGEKIT_AUTH = gql`
  mutation GetImagekitAuth {
    getImagekitAuth {
      token
      expire
      signature
      publicKey
      urlEndpoint
    }
  }
`;

const PEXELS_SEARCH = gql`
  query PexelsSearch($query: String, $page: Int, $perPage: Int) {
    pexelsSearch(query: $query, page: $page, perPage: $perPage) {
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

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onPicked: (url: string) => void;
  /** ImageKit folder e.g. "/users", "/posts", "/branding" */
  folder?: string;
  title?: string;
  /** Comma-separated mime list. Defaults to images. */
  accept?: string;
}

const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

export default function MediaPickerDialog({
  open,
  onClose,
  onPicked,
  folder = '/uploads',
  title = 'Select an image',
  accept = 'image/*',
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
  const [psearching, setPsearching] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const client = useApolloClient();
  const [getAuthMut] = useMutation(IMAGEKIT_AUTH);
  const [importMut] = useMutation(IMPORT_REMOTE);

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
    if (open && tab === 1 && photos.length === 0) {
      void runPexels(pquery, 1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  const runPexels = async (q: string, p: number, append: boolean) => {
    setPsearching(true);
    setError(null);
    try {
      const res = await client.query({
        query: PEXELS_SEARCH,
        variables: { query: q || null, page: p, perPage: 24 },
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
    if (!f.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setError('File is too large (max 15 MB)');
      return;
    }
    setError(null);
    setPicked(f);
  };

  const uploadFromDevice = async () => {
    if (!picked) return;
    setUploading(true);
    setUploadPct(0);
    setError(null);
    try {
      const auth = (await getAuthMut()).data.getImagekitAuth;
      const form = new FormData();
      // Order matches the official ImageKit JS SDK — auth fields first, then
      // the file body. Some upstream parsers fail signature verification when
      // the file appears before the signature.
      form.append('publicKey', auth.publicKey);
      form.append('signature', auth.signature);
      form.append('expire', String(auth.expire));
      form.append('token', auth.token);
      form.append('fileName', picked.name);
      form.append('useUniqueFileName', 'true');
      if (folder) form.append('folder', folder);
      form.append('file', picked);

      const url: string = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', IMAGEKIT_UPLOAD_URL);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setUploadPct(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && json.url) {
              resolve(json.url);
            } else {
              reject(new Error(json?.message || `Upload failed (${xhr.status})`));
            }
          } catch {
            reject(new Error('Invalid response from upload server'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(form);
      });
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
        <Tab label="Pexels stock" />
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
                <img
                  src={previewUrl}
                  alt="preview"
                  style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'contain' }}
                />
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
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
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
              <Button variant="contained" onClick={() => runPexels(pquery, 1, false)}>
                Search
              </Button>
            </Stack>
            {psearching && photos.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : photos.length === 0 ? (
              <Alert severity="info">No results — try a different query.</Alert>
            ) : (
              <ImageList cols={3} gap={8} rowHeight={160}>
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
