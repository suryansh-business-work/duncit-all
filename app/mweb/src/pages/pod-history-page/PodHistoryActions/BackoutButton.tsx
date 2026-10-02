import { Tooltip } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../../i18n/useTranslation';

/**
 * The Backout control, and the reason it is sometimes dead.
 *
 * Shown-and-disabled rather than hidden once the attempts are gone: a booking
 * that HAD this button yesterday and simply lacks it today reads as a bug, so
 * the control stays and says why. The words come from Pod Details, which
 * refuses the same booking for the same reason.
 */
export default function BackoutButton({
  disabled,
  maxed,
  label,
  onBackout,
}: Readonly<{ disabled: boolean; maxed: boolean; label: string; onBackout: () => void }>) {
  const { t } = useTranslation();
  const button = (
    <DuncitButton
      data-tour="booking-backout"
      data-testid="ph-backout"
      onClick={onBackout}
      disabled={disabled || maxed}
      color="error"
      variant="outlined"
      startIcon={<RestartAltIcon />}
    >
      {label}
    </DuncitButton>
  );
  if (!maxed) return button;
  return (
    // A disabled button fires no pointer events of its own, so the tooltip
    // listens on a wrapper — otherwise hovering it says nothing at all.
    <Tooltip title={t('mweb.podDetails.backoutMaxed')} enterTouchDelay={0} arrow>
      <span style={{ display: 'inline-flex' }}>{button}</span>
    </Tooltip>
  );
}
