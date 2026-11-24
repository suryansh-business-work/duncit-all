import { useState } from 'react';
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { PANE_ORDER, type PaneId } from './layoutModel';
import type { StudioLayoutState } from './useStudioLayout';

interface Props {
  state: StudioLayoutState;
  /** Each pane's name, as its bar shows it. */
  titles: Readonly<Record<PaneId, string>>;
}

/**
 * The studio's layout controls: show or hide each pane (a closed pane comes
 * back docked), save the arrangement to the person's account, or restore the
 * default view.
 */
export default function LayoutMenu({ state, titles }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  const toggle = (id: PaneId) => {
    state.setMode(id, state.layout[id].mode === 'CLOSED' ? 'DOCKED' : 'CLOSED');
  };

  return (
    <>
      <DuncitButton
        size="small"
        startIcon={<DashboardCustomizeIcon fontSize="small" />}
        aria-haspopup="menu"
        aria-expanded={anchor ? 'true' : undefined}
        aria-controls={anchor ? 'reel-layout-menu' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        data-testid="reel-layout-button"
      >
        {state.dirty ? t('ai.reels.layout.menuUnsaved') : t('ai.reels.layout.menu')}
      </DuncitButton>
      <Menu id="reel-layout-menu" anchorEl={anchor} open={anchor !== null} onClose={close}>
        {PANE_ORDER.map((id) => {
          const shown = state.layout[id].mode !== 'CLOSED';
          return (
            <MenuItem key={id} role="menuitemcheckbox" aria-checked={shown} onClick={() => toggle(id)} data-testid={`reel-layout-toggle-${id.toLowerCase()}`}>
              <ListItemIcon>{shown ? <CheckBoxIcon fontSize="small" /> : <CheckBoxOutlineBlankIcon fontSize="small" />}</ListItemIcon>
              <ListItemText>{titles[id]}</ListItemText>
            </MenuItem>
          );
        })}
        <Divider />
        <MenuItem
          disabled={!state.dirty || state.saving}
          onClick={() => {
            close();
            fireAndForget(state.save(), logs.portal.marketing, 'reels', 'layout-save');
          }}
          data-testid="reel-layout-save"
        >
          <ListItemIcon>
            <SaveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('ai.reels.layout.save')}</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={state.restoring}
          onClick={() => {
            close();
            fireAndForget(state.restore(), logs.portal.marketing, 'reels', 'layout-restore');
          }}
          data-testid="reel-layout-restore"
        >
          <ListItemIcon>
            <RestartAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('ai.reels.layout.restore')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
