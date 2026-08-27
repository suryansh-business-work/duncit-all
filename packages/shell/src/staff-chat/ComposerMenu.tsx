import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlaceIcon from '@mui/icons-material/Place';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { DuncitIconButton } from '@duncit/buttons';

interface Props {
  /** Opens the place search. */
  onShareLocation: () => void;
  /** Sends wherever this device says it is, without a search. */
  onShareCurrentLocation?: () => void;
}

/**
 * The three dots beside the box.
 *
 * Everything that is not "type words or attach a file" lives here, so the
 * composer stays a composer. Right now that is sharing a place; it is the
 * natural home for whatever comes next.
 */
export default function ComposerMenu({ onShareLocation, onShareCurrentLocation }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  return (
    <>
      <Tooltip title={t('shell.chat.composer.more')}>
        <DuncitIconButton size="small" aria-label={t('shell.chat.composer.moreOptions')} onClick={(e) => setAnchor(e.currentTarget)}>
          <MoreVertIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem
          onClick={() => {
            onShareLocation();
            close();
          }}
        >
          <ListItemIcon>
            <PlaceIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('shell.chat.composer.searchPlace')}</ListItemText>
        </MenuItem>
        {onShareCurrentLocation && (
          <MenuItem
            onClick={() => {
              onShareCurrentLocation();
              close();
            }}
          >
            <ListItemIcon>
              <MyLocationIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('shell.chat.composer.sendLocation')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
