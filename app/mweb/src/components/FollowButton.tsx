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

interface Props {
  status: FollowStatus;
  /** Whether this person already follows the viewer — the resting state then
   * reads "Follow Back", the same words the inbox uses for the same tap. */
  followsViewer?: boolean | null;
  disabled?: boolean;
  loading?: boolean;
  onToggle: () => void;
}

/** Follow / Follow Back / Requested / Following. REQUESTED is a real, tappable
 * state — it withdraws the pending ask — so it is styled as an outlined button
 * rather than a disabled one. Twin of native's <FollowStatusButton/> (rule 27). */
export default function FollowButton({
  status,
  followsViewer,
  disabled,
  loading,
  onToggle,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <DuncitButton
      size="small"
      variant={status === 'FOLLOWING' ? 'contained' : 'outlined'}
      color={status === 'NONE' ? 'inherit' : 'primary'}
      startIcon={loading ? <CircularProgress size={14} /> : ICONS[status]}
      disabled={disabled || loading}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {t(followButtonLabelKey(status, followsViewer))}
    </DuncitButton>
  );
}
