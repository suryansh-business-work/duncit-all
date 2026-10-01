import { useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitRoundButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  /** The post id of the slide on screen. */
  slideId: string;
  /** Own story only — delete this slide. */
  onDelete?: (slideId: string) => void;
  /** Somebody else's story — flag this slide to the Legal team. */
  onReport?: (slideId: string) => void;
}

/**
 * The 3-dot menu on an open status. Native twin: ContentActionsMenu (rule 27).
 *
 * Delete is the owner's and Report is everybody else's, so a slide normally
 * shows one or the other. The viewer keys this by slide, which is what closes
 * an open menu when the story moves on underneath it.
 */
export default function StatusOptionsMenu({ slideId, onDelete, onReport }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const run = (action: (slideId: string) => void) => () => {
    setAnchor(null);
    action(slideId);
  };

  return (
    <>
      <DuncitRoundButton
        tone="overlay"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={t('mweb.home.storyOptions')}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        data-testid="status-kebab"
      >
        <MoreVertIcon />
      </DuncitRoundButton>
      <Menu data-testid="status-menu" anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {onDelete && (
          <MenuItem
            data-testid="status-delete"
            onClick={run(onDelete)}
            sx={{ color: 'error.main', fontWeight: 600 }}
          >
            <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
            {t('mweb.common.delete')}
          </MenuItem>
        )}
        {onReport && (
          <MenuItem data-testid="status-report" onClick={run(onReport)} sx={{ fontWeight: 600 }}>
            <FlagOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
            {t('contentReport.report')}
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
