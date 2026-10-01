import { useState } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { REPORT_COPY, type ReportableKind } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

/** Where the 3-dot button sits: over media (a story) or on a plain surface (a post header). */
type MenuTone = 'overlay' | 'surface';

interface Props {
  /** A post or a story — picks the wording and the test ids. */
  kind: ReportableKind;
  /** Only true when the server said this viewer may delete THIS item. */
  canDelete: boolean;
  /** False for the owner: nobody reviews a report against your own content. */
  canReport: boolean;
  onDelete: () => void;
  onReport: () => void;
  tone?: MenuTone;
}

const TRIGGER_SX: Record<MenuTone, object> = {
  overlay: {
    color: 'common.white',
    bgcolor: 'rgba(0,0,0,0.4)',
    minWidth: 44,
    minHeight: 44,
    '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
  },
  surface: {},
};

/**
 * The 3-dot menu on user-generated content — an open story or a post.
 * Native twin (rule 27).
 *
 * Report is there for anyone looking at somebody else's content. Delete is
 * drawn only when the viewer may delete it, so nobody is shown a control that
 * will refuse them. With neither, there is no menu to open and nothing is drawn.
 */
export default function ContentActionsMenu({
  kind,
  canDelete,
  canReport,
  onDelete,
  onReport,
  tone = 'overlay',
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const copy = REPORT_COPY[kind];
  // `story-actions-menu-*` predates posts having a menu; a post gets `post-…`.
  const id = `${kind.toLowerCase()}-actions-menu`;

  if (!canDelete && !canReport) return null;

  const run = (action: () => void) => () => {
    setAnchor(null);
    action();
  };

  return (
    <>
      <DuncitIconButton
        data-testid={`${id}-trigger`}
        size={tone === 'surface' ? 'small' : 'medium'}
        aria-label={t(copy.menuLabel)}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={TRIGGER_SX[tone]}
      >
        <MoreVertIcon fontSize={tone === 'surface' ? 'small' : 'medium'} />
      </DuncitIconButton>
      <Menu data-testid={id} anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {canDelete && (
          <MenuItem data-testid={`${id}-delete`} onClick={run(onDelete)}>
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText slotProps={{ primary: { color: 'error' } }}>{t(copy.delete)}</ListItemText>
          </MenuItem>
        )}
        {canReport && (
          <MenuItem data-testid={`${id}-report`} onClick={run(onReport)}>
            <ListItemIcon>
              <FlagOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t(copy.report)}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
