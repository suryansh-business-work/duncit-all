import { useId, useState } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import UnarchiveRoundedIcon from '@mui/icons-material/UnarchiveRounded';
import type { OccasionTheme } from '@duncit/gql-types';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  look: OccasionTheme;
  onDuplicate: () => void;
  onArchive: () => void;
  onReset: () => void;
  onDelete: () => void;
}

/**
 * The rarer things a look can have done to it. A built-in look can be reset
 * but never deleted; one someone made can be deleted but has nothing to reset to.
 */
export default function ThemeCardMenu({ look, onDuplicate, onArchive, onReset, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const pick = (action: () => void) => () => {
    setAnchor(null);
    action();
  };
  const label = t('marketing.occasions.card.more', { vars: { name: look.name } });

  return (
    <>
      <Tooltip title={label}>
        <DuncitIconButton
          aria-label={label}
          aria-haspopup="menu"
          aria-controls={anchor ? menuId : undefined}
          aria-expanded={anchor ? 'true' : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <MoreVertRoundedIcon />
        </DuncitIconButton>
      </Tooltip>
      <Menu id={menuId} anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={pick(onDuplicate)}>
          <ListItemIcon>
            <ContentCopyRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('marketing.occasions.actions.duplicate')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={pick(onArchive)}>
          <ListItemIcon>
            {look.is_archived ? <UnarchiveRoundedIcon fontSize="small" /> : <ArchiveRoundedIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{t(look.is_archived ? 'marketing.occasions.actions.unarchive' : 'marketing.occasions.actions.archive')}</ListItemText>
        </MenuItem>
        {look.is_builtin ? (
          <MenuItem onClick={pick(onReset)}>
            <ListItemIcon>
              <RestartAltRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('marketing.occasions.actions.reset')}</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={pick(onDelete)} sx={{ color: 'error.main' }}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DeleteOutlineRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('shell.common.delete')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
