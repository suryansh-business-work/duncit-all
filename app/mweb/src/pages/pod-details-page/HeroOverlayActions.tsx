import { CircularProgress, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  onBack: () => void;
  saved: boolean;
  saveLoading?: boolean;
  onToggleSave: () => void;
  onShare: () => void;
}

/** A 40px round surface button — the detail pages' top-bar control. */
const roundBtn = {
  width: 40,
  height: 40,
  minHeight: 40,
  bgcolor: 'background.paper',
  color: 'text.primary',
  border: '1px solid var(--duncit-card-border)',
  '&:hover': { bgcolor: 'background.paper' },
};

/**
 * The pod page's top bar: Back on the left, Save and Share on the right, each a
 * round surface button above the hero rather than floating on the photo.
 * Native twin: the top bar of components/details/DetailHero.
 */
export default function HeroOverlayActions({ onBack, saved, saveLoading, onToggleSave, onShare }: Readonly<Props>) {
  const { t } = useTranslation();
  const savedIcon = saved ? (
    <BookmarkIcon fontSize="small" sx={{ color: 'primary.main' }} />
  ) : (
    <BookmarkBorderIcon fontSize="small" />
  );
  const saveLabel = saved ? t('mweb.podDetails.saved') : t('mweb.podDetails.save');
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <DuncitIconButton onClick={onBack} aria-label={t('mweb.podDetails.back')} sx={roundBtn}>
        <ArrowBackIcon fontSize="small" />
      </DuncitIconButton>
      <Stack direction="row" spacing={1}>
        <DuncitIconButton aria-label={saveLabel} onClick={onToggleSave} disabled={saveLoading} sx={roundBtn}>
          {saveLoading ? <CircularProgress size={18} color="inherit" /> : savedIcon}
        </DuncitIconButton>
        <DuncitIconButton aria-label={t('mweb.podDetails.share')} onClick={onShare} sx={roundBtn}>
          <ShareIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
    </Stack>
  );
}
