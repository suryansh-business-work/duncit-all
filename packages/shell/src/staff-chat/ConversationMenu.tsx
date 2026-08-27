import { useState } from 'react';
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import TuneIcon from '@mui/icons-material/Tune';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  onExport: () => void;
  onClear: () => void;
  onSettings: () => void;
}

/**
 * Everything the header can do that is not a call.
 *
 * Behind three dots rather than three more icons: the bar already carries
 * back, two call buttons and search, and a row where every action looks
 * equally urgent is a row nobody reads. These three are the ones you reach for
 * once a week, not once a minute.
 */
export default function ConversationMenu({ onExport, onClear, onSettings }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (action: () => void) => () => {
    action();
    close();
  };

  return (
    <>
      <Tooltip title={t('shell.chat.menu.more')}>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.chat.menu.more')}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <MoreVertIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={run(onExport)}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('shell.chat.menu.download')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onSettings)}>
          <ListItemIcon>
            <TuneIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('shell.chat.menu.settings')}</ListItemText>
        </MenuItem>

        {/* Below the line, in error red: it empties the thread for the other
            person too, and it is one item away from "download". */}
        <Divider />
        <MenuItem onClick={run(onClear)}>
          <ListItemIcon>
            <DeleteSweepIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText slotProps={{
            primary: { color: 'error' }
          }}>
            {t('shell.chat.menu.clear')}
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
