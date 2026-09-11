import { CircularProgress, Stack } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import ShareIcon from '@mui/icons-material/ShareRounded';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import CheckIcon from '@mui/icons-material/CheckRounded';
import AddIcon from '@mui/icons-material/AddRounded';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

/** The dark disc every control over the hero photo sits on — a black scrim
 * over media, legible on any photo in either theme. */
const heroScrim = (theme: Theme) => alpha(theme.palette.common.black, 0.45);

const ROUND_SX = (theme: Theme) => ({
  width: 40,
  height: 40,
  minHeight: 40,
  bgcolor: heroScrim(theme),
  color: 'common.white',
  backdropFilter: 'blur(6px)',
  '&:hover': { bgcolor: alpha(theme.palette.common.black, 0.6) },
});

interface Props {
  saved: boolean;
  saveLoading?: boolean;
  following: boolean;
  onBack: () => void;
  onToggleFollow: () => void;
  onToggleSave: () => void;
  onShare: () => void;
}

/** Back on the left; Follow (green, or a dark "Following" pill once followed),
 * Save and Share on the right — all round 40px controls over the hero. */
export default function ClubHeroActions({
  saved,
  saveLoading,
  following,
  onBack,
  onToggleFollow,
  onToggleSave,
  onShare,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const savedIcon = saved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />;
  const followSx = following
    ? (theme: Theme) => ({ height: 40, minHeight: 40, px: 1.75, bgcolor: heroScrim(theme), color: 'common.white', backdropFilter: 'blur(6px)' })
    : { height: 40, minHeight: 40, px: 1.75 };
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
        zIndex: 2,
        pointerEvents: 'none',
        '& > *': { pointerEvents: 'auto' }
      }}>
      <DuncitIconButton onClick={onBack} aria-label={t('mweb.common.back')} sx={ROUND_SX}>
        <ArrowBackIcon fontSize="small" />
      </DuncitIconButton>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <DuncitButton
          variant={following ? 'text' : 'contained'}
          aria-label={following ? 'Following' : 'Follow'}
          onClick={onToggleFollow}
          startIcon={following ? <CheckIcon sx={{ fontSize: 16 }} /> : <AddIcon sx={{ fontSize: 16 }} />}
          sx={followSx}
        >
          {following ? 'Following' : 'Follow'}
        </DuncitButton>
        <DuncitIconButton
          aria-label={saved ? 'Saved' : 'Save'}
          onClick={onToggleSave}
          disabled={saveLoading}
          sx={ROUND_SX}
        >
          {saveLoading ? <CircularProgress size={18} color="inherit" /> : savedIcon}
        </DuncitIconButton>
        <DuncitIconButton aria-label={t('mweb.common.share')} onClick={onShare} sx={ROUND_SX}>
          <ShareIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
    </Stack>
  );
}
