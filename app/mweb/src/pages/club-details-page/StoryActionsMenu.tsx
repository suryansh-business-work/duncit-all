import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** Only true when the server said this viewer may delete THIS story. */
  canDelete: boolean;
  onDelete: () => void;
  onReport: () => void;
}

/**
 * The 3-dot menu on an open story. Native twin (rule 27).
 *
 * Report is always there — anyone looking at a story can flag it. Delete is
 * drawn only when the server's `can_delete` said yes, so a viewer is never
 * shown a control that will refuse them.
 */
export default function StoryActionsMenu({ canDelete, onDelete, onReport }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const run = (action: () => void) => () => {
    setAnchor(null);
    action();
  };

  return (
    <>
      <IconButton
        aria-label={t('contentReport.menuLabel')}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          color: 'common.white',
          bgcolor: 'rgba(0,0,0,0.4)',
          minWidth: 44,
          minHeight: 44,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
        }}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {canDelete && (
          <MenuItem onClick={run(onDelete)}>
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ color: 'error' }}>
              {t('contentReport.delete')}
            </ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={run(onReport)}>
          <ListItemIcon>
            <FlagOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('contentReport.report')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
