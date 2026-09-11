import { CircularProgress } from '@mui/material';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { DuncitButton } from '@duncit/buttons';
import { followButtonLabelKey, type FollowStatus } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';

const ICONS: Record<FollowStatus, React.ReactNode> = {
  NONE: <PersonAddAltIcon />,
  REQUESTED: <HourglassTopIcon />,
  FOLLOWING: <HowToRegIcon />,
};

/** The live states (a pending ask, an existing follow) read as a soft pill;
 * the resting Follow is the green one. Min-height keeps the coarse-pointer
 * 44px rule off a small pill. */
const SOFT_SX = {
  minHeight: 32,
  bgcolor: 'action.hover',
  color: 'text.primary',
  '&:hover': { bgcolor: 'action.selected' },
} as const;
const GREEN_SX = { minHeight: 32 } as const;

interface Props {
  status: FollowStatus;
  /** Whether this person already follows the viewer — the resting state then
   * reads "Follow Back", the same words the inbox uses for the same tap. */
  followsViewer?: boolean | null;
  disabled?: boolean;
  loading?: boolean;
  /** Return the follow/unfollow promise and the button spins until it settles
   *  — a handler that returns nothing behaves exactly as it did before. */
  onToggle: () => void | Promise<unknown>;
}

/** Follow / Follow Back / Requested / Following. REQUESTED is a real, tappable
 * state — it withdraws the pending ask — so it is a soft pill rather than a
 * disabled one. Twin of native's <FollowStatusButton/> (rule 27). */
export default function FollowButton({
  status,
  followsViewer,
  disabled,
  loading,
  onToggle,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const resting = status === 'NONE';
  return (
    <DuncitButton
      size="small"
      variant={resting ? 'contained' : 'text'}
      startIcon={loading ? <CircularProgress size={14} color="inherit" /> : ICONS[status]}
      disabled={disabled || loading}
      sx={resting ? GREEN_SX : SOFT_SX}
      onClick={(event) => {
        event.stopPropagation();
        // Returned, not dropped: DuncitButton spins on a promise-returning
        // handler, and a follow is a round trip plus the list re-read after it.
        return onToggle();
      }}
    >
      {t(followButtonLabelKey(status, followsViewer))}
    </DuncitButton>
  );
}
