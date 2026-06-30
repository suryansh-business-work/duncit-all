import { useState } from 'react';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CampaignIcon from '@mui/icons-material/Campaign';
import PodcastsIcon from '@mui/icons-material/Podcasts';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';

type NotifyPref = 'ALL' | 'PODS' | 'IMPORTANT' | 'OFF';

interface Props {
  clubId: string;
}

const STORAGE_KEY = (id: string) => `club_notify_${id}`;

const OPTIONS: { value: NotifyPref; label: string; Icon: React.ElementType }[] = [
  { value: 'ALL', label: 'All notifications', Icon: NotificationsActiveIcon },
  { value: 'PODS', label: 'Pods only', Icon: PodcastsIcon },
  { value: 'IMPORTANT', label: 'Important only', Icon: CampaignIcon },
  { value: 'OFF', label: 'Mute', Icon: NotificationsOffIcon },
];

function readPref(clubId: string): NotifyPref | null {
  try {
    return (localStorage.getItem(STORAGE_KEY(clubId)) as NotifyPref | null);
  } catch {
    return null;
  }
}

function savePref(clubId: string, pref: NotifyPref) {
  try {
    localStorage.setItem(STORAGE_KEY(clubId), pref);
  } catch {
    /* storage blocked */
  }
}

export default function ClubNotifyButton({ clubId }: Readonly<Props>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [pref, setPref] = useState<NotifyPref | null>(() => readPref(clubId));

  const open = Boolean(anchorEl);
  const isActive = pref !== null && pref !== 'OFF';

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = (value: NotifyPref) => {
    savePref(clubId, value);
    setPref(value);
    handleClose();
  };

  return (
    <>
      <Tooltip title={pref ? `Notifications: ${pref}` : 'Subscribe to notifications'}>
        <IconButton onClick={handleOpen} size="small" color={isActive ? 'primary' : 'default'}>
          {isActive ? <NotificationsActiveIcon /> : <NotificationsNoneIcon />}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {OPTIONS.map(({ value, label, Icon }) => (
          <MenuItem key={value} onClick={() => handleSelect(value)} selected={pref === value}>
            <ListItemIcon>
              {pref === value ? <CheckIcon color="primary" fontSize="small" /> : <Icon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
