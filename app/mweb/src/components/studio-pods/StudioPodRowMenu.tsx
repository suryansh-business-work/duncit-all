import { useState } from 'react';
import { ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';
import { changeRequestBlockedKey, venueCancelDisabledText } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { StudioPod } from './types';

interface Props {
  pod: StudioPod;
  /** Venue Studio only — the owner's own cancel. */
  onCancel?: () => void;
  /** "Request Change Venue" / "…Club Admin" — the studio decides which. */
  onRequestChange?: () => void;
  /** Already-translated label for the request item, so one menu serves both
   * studios without deciding for itself which role it is looking at. */
  requestChangeLabel?: string;
}

/**
 * The overflow menu on a Venue Studio row. Its one action is "Cancel pod":
 * enabled while the shared rule (`canCancelVenuePod`) allows it, otherwise
 * shown disabled with the reason underneath, so the owner reads WHY rather
 * than finding the action missing. Native twin (rule 27).
 */
export default function StudioPodRowMenu({
  pod,
  onCancel,
  onRequestChange,
  requestChangeLabel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // The shared rule answers why the action is closed, already worded.
  const secondary = venueCancelDisabledText(pod, t) ?? undefined;
  const disabled = secondary !== undefined;
  // The same shared rule the server enforces: a finished or cancelled pod has
  // nothing left to hand over. Shown closed WITH the reason rather than hidden,
  // so a partner reads why instead of hunting for a missing action.
  const changeBlockedKey = changeRequestBlockedKey(pod, null);
  const changeBlocked = changeBlockedKey ? t(changeBlockedKey) : undefined;

  const pick = (action?: () => void) => () => {
    setAnchor(null);
    action?.();
  };

  return (
    <>
      <DuncitIconButton
        aria-label={t('mweb.hostManage.podActions')}
        size="small"
        onClick={(event) => setAnchor(event.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </DuncitIconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {onCancel && (
          <MenuItem disabled={disabled} onClick={pick(onCancel)}>
            <ListItemText
              primary={t('mweb.venuePods.cancelPod')}
              secondary={secondary}
              slotProps={{ primary: { color: disabled ? 'text.primary' : 'error' } }}
            />
          </MenuItem>
        )}
        {onRequestChange && requestChangeLabel && (
          <MenuItem disabled={changeBlocked !== undefined} onClick={pick(onRequestChange)}>
            <ListItemText primary={requestChangeLabel} secondary={changeBlocked} />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
