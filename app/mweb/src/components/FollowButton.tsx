import { Button, CircularProgress } from '@mui/material';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { FOLLOW_LABEL_KEY, type FollowStatus } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';

const ICONS: Record<FollowStatus, React.ReactNode> = {
  NONE: <PersonAddAltIcon />,
  REQUESTED: <HourglassTopIcon />,
  FOLLOWING: <HowToRegIcon />,
};

interface Props {
  status: FollowStatus;
  disabled?: boolean;
  loading?: boolean;
  onToggle: () => void;
}

/** Follow / Requested / Following. REQUESTED is a real, tappable state — it
 * withdraws the pending ask — so it is styled as an outlined button rather than
 * a disabled one. Twin of native's <FollowButton/> (rule 27). */
export default function FollowButton({ status, disabled, loading, onToggle }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Button
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
      {t(FOLLOW_LABEL_KEY[status])}
    </Button>
  );
}
