import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

interface Props {
  anchorEl: HTMLElement | null;
  hasPhoto: boolean;
  onView: () => void;
  onChange: () => void;
  onRemove: () => void;
  onClose: () => void;
}

/** Instagram-style profile-photo menu (item 9): View / Change / Remove. Remove
 * only appears when a photo exists. */
export default function PhotoActionMenu({
  anchorEl,
  hasPhoto,
  onView,
  onChange,
  onRemove,
  onClose,
}: Readonly<Props>) {
  return (
    <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={onClose}>
      {hasPhoto && (
        <MenuItem data-testid="photo-action-view" onClick={onView}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View photo</ListItemText>
        </MenuItem>
      )}
      <MenuItem data-testid="photo-action-change" onClick={onChange}>
        <ListItemIcon>
          <PhotoCameraIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Change photo</ListItemText>
      </MenuItem>
      {hasPhoto && (
        <MenuItem data-testid="photo-action-remove" onClick={onRemove} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Remove photo</ListItemText>
        </MenuItem>
      )}
    </Menu>
  );
}
