import { Box, Button, Dialog, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

export interface HomeStatusViewerItem {
  label: string;
  subLabel?: string;
  avatarUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  targetUrl?: string;
  internal?: boolean;
}

interface HomeStatusViewerProps {
  item: HomeStatusViewerItem | null;
  onClose: () => void;
}

export default function HomeStatusViewer({ item, onClose }: HomeStatusViewerProps) {
  const navigate = useNavigate();
  if (!item) return null;

  const openTarget = () => {
    if (!item.targetUrl) return;
    onClose();
    if (item.internal) navigate(item.targetUrl);
    else window.open(item.targetUrl, '_blank', 'noreferrer');
  };

  return (
    <Dialog open={!!item} fullScreen onClose={onClose} PaperProps={{ sx: { bgcolor: '#08070b' } }}>
      <Box sx={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', color: '#fff' }}>
        {item.mediaType === 'VIDEO' ? (
          <Box component="video" src={item.mediaUrl ?? undefined} autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : item.mediaUrl ? (
          <Box component="img" src={item.mediaUrl} alt={item.label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #ff7a59 0%, #ed4f7a 45%, #15111c 100%)' }} />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.52) 0%, transparent 30%, rgba(0,0,0,0.82) 100%)' }} />
        <Stack spacing={1.2} sx={{ position: 'absolute', top: 12, left: 12, right: 12 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5 }}>
            {[0, 1, 2].map((step) => (
              <Box key={step} sx={{ height: 3, borderRadius: 999, bgcolor: step === 0 ? '#fff' : 'rgba(255,255,255,0.28)' }} />
            ))}
          </Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              component={item.avatarUrl ? 'img' : 'div'}
              src={item.avatarUrl || undefined}
              sx={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', bgcolor: 'primary.main' }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
                {item.label}
              </Typography>
              {item.subLabel && <Typography variant="caption" sx={{ opacity: 0.78 }} noWrap>{item.subLabel}</Typography>}
            </Box>
            <IconButton onClick={onClose} aria-label="Close status" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.34)' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
        {item.targetUrl && (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={openTarget}
            sx={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(18px + env(safe-area-inset-bottom))', borderRadius: 999, fontWeight: 900 }}
          >
            Open details
          </Button>
        )}
      </Box>
    </Dialog>
  );
}