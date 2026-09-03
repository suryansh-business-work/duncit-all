import { useState } from 'react';
import { ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';
import { cancelDisabledReason, type VenueCancelDisabledReason } from '@duncit/utils';
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
  const reason = cancelDisabledReason(pod);
  // Written out as literals so the shipped-key gate sees each one (rule 38).
  const reasonText: Record<VenueCancelDisabledReason, string> = {
    ALREADY_CANCELLED: t('mweb.venuePods.alreadyCancelled'),
    ALREADY_STARTED: t('mweb.venuePods.alreadyStarted'),
    ALREADY_FINISHED: t('mweb.venuePods.alreadyFinished'),
  };
  const secondary = reason ? reasonText[reason] : undefined;

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
        <MenuItem disabled={!!reason} onClick={pick}>
          <ListItemText
            primary={t('mweb.venuePods.cancelPod')}
            secondary={secondary}
            slotProps={{ primary: { color: reason ? 'text.primary' : 'error' } }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}
