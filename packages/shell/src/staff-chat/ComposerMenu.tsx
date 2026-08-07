import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlaceIcon from '@mui/icons-material/Place';
import MyLocationIcon from '@mui/icons-material/MyLocation';

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
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  return (
    <>
      <Tooltip title="More">
        <IconButton size="small" aria-label="More options" onClick={(e) => setAnchor(e.currentTarget)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
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
          <ListItemText>Search a place</ListItemText>
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
            <ListItemText>Send my location</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
