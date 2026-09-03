import { useState } from 'react';
import { ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';
import { venueCancelDisabledText } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import type { StudioPod } from './types';

interface Props {
  pod: StudioPod;
  onCancel: () => void;
}

/**
 * The overflow menu on a Venue Studio row. Its one action is "Cancel pod":
 * enabled while the shared rule (`canCancelVenuePod`) allows it, otherwise
 * shown disabled with the reason underneath, so the owner reads WHY rather
 * than finding the action missing. Native twin (rule 27).
 */
export default function StudioPodRowMenu({ pod, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // The shared rule answers why the action is closed, already worded.
  const secondary = venueCancelDisabledText(pod, t) ?? undefined;
  const disabled = secondary !== undefined;

  const pick = () => {
    setAnchor(null);
    onCancel();
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
        <MenuItem disabled={disabled} onClick={pick}>
          <ListItemText
            primary={t('mweb.venuePods.cancelPod')}
            secondary={secondary}
            slotProps={{ primary: { color: disabled ? 'text.primary' : 'error' } }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}
