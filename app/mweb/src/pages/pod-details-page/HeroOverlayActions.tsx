import { CircularProgress, Stack, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  onBack: () => void;
  saved: boolean;
  saveLoading?: boolean;
  onToggleSave: () => void;
  onShare: () => void;
}

const overlayBtn = {
  bgcolor: 'rgba(255,255,255,0.92)',
  color: '#111827',
  width: 40,
  height: 40,
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  backdropFilter: 'blur(10px)',
  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
};

export default function HeroOverlayActions({ onBack, saved, saveLoading, onToggleSave, onShare }: Readonly<Props>) {
  const { t } = useTranslation();
  const savedIcon = saved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />;
  const saveLabel = saved ? t('mweb.podDetails.saved') : t('mweb.podDetails.save');
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top) + 12px)',
        left: 12,
        right: 12,
        zIndex: 3,
        pointerEvents: 'none',
        '& > *': { pointerEvents: 'auto' }
      }}>
      <IconButton size="small" onClick={onBack} aria-label={t('mweb.podDetails.back')} sx={overlayBtn}>
        <ArrowBackIcon fontSize="small" />
      </IconButton>
      <Stack direction="row" spacing={0.75}>
        <IconButton
          size="small"
          aria-label={saveLabel}
          onClick={onToggleSave}
          disabled={saveLoading}
          sx={overlayBtn}
        >
          {saveLoading ? <CircularProgress size={18} color="inherit" /> : savedIcon}
        </IconButton>
        <IconButton size="small" aria-label={t('mweb.podDetails.share')} onClick={onShare} sx={overlayBtn}>
          <ShareIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
}
