import { Tooltip } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';

/**
 * A free pod's Cancel Spot control, and the reason it is sometimes dead.
 *
 * Pod Settings caps how many times a member may cancel their spot on one free
 * pod. Once that is used up the control stays, disabled, and says why — the
 * same shape as BackoutButton, and the same words Pod Details shows.
 */
export default function CancelSpotButton({
  disabled,
  maxed,
  label,
  onCancelSpot,
}: Readonly<{ disabled: boolean; maxed: boolean; label: string; onCancelSpot?: () => void }>) {
  const { t } = useTranslation();
  const button = (
    <DuncitButton
      onClick={onCancelSpot}
      disabled={disabled || maxed}
      color="error"
      variant="outlined"
      startIcon={<EventBusyIcon />}
      data-testid="ph-cancel-spot"
    >
      {label}
    </DuncitButton>
  );
  if (!maxed) return button;
  return (
    // A disabled button fires no pointer events of its own, so the tooltip
    // listens on a wrapper — otherwise hovering it says nothing at all.
    <Tooltip title={t('mweb.podDetails.cancelSpotLimitReached')} enterTouchDelay={0} arrow>
      <span style={{ display: 'inline-flex' }}>{button}</span>
    </Tooltip>
  );
}
