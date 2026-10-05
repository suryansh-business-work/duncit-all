import { useState } from 'react';
import { CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '../../i18n/useTranslation';
import ReportContentDialog from '../../components/content-report/ReportContentDialog';
import { useProfileBlock, type BlockableProfile } from './useProfileBlock';

const ID = 'public-profile-actions';

interface Props {
  profile: BlockableProfile;
  /** Re-read the profile after a block or unblock. */
  onChanged: () => unknown;
}

/**
 * The 3-dot menu beside the Profile title on somebody else's profile: Block
 * (or Unblock) and Report. Native twin: ProfileActionsMenu (rule 27).
 *
 * While a block is going through, the trigger turns into a spinner and stays
 * disabled, so a second tap cannot race the first.
 */
export default function ProfileActionsMenu({ profile, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const block = useProfileBlock(profile, onChanged);

  const run = (action: () => void) => () => {
    setAnchor(null);
    action();
  };

  return (
    <>
      <DuncitIconButton
        data-testid={`${ID}-trigger`}
        aria-label={block.busy ? t(block.copy.busy) : t('contentReport.profileMenuLabel')}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-busy={block.busy}
        disabled={block.busy}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{ width: 40, height: 40, minHeight: 40, bgcolor: 'background.paper', color: 'text.primary' }}
      >
        {block.busy ? (
          <CircularProgress data-testid={`${ID}-busy`} size={18} color="inherit" />
        ) : (
          <MoreVertIcon fontSize="small" />
        )}
      </DuncitIconButton>
      <Menu
        data-testid={ID}
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem data-testid={`${ID}-block`} onClick={run(() => fireAndForget(block.toggle(), logs.mWeb, 'ProfileActionsMenu', 'toggle'))}>
          <ListItemIcon>
            {block.action === 'BLOCK' ? (
              <BlockIcon fontSize="small" color="error" />
            ) : (
              <CheckCircleOutlineIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText slotProps={{ primary: { color: block.action === 'BLOCK' ? 'error' : 'textPrimary' } }}>
            {t(block.copy.menu)}
          </ListItemText>
        </MenuItem>
        <MenuItem data-testid={`${ID}-report`} onClick={run(() => setReporting(profile.user_id))}>
          <ListItemIcon>
            <FlagOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('contentReport.reportProfile')}</ListItemText>
        </MenuItem>
      </Menu>
      <ReportContentDialog kind="PROFILE" targetId={reporting} onClose={() => setReporting(null)} />
    </>
  );
}
