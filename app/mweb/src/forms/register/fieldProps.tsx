import { InputAdornment } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { DuncitIconButton } from '@duncit/buttons';

/**
 * The two adornment shapes signup's boxes share.
 *
 * They live apart from the steps because the password step renders the second
 * one twice — a new password and its confirmation — and a copy of it per box is
 * how a toggle ends up looking different from the box beside it.
 */

/** A leading icon, for the boxes that carry one. */
export const startIcon = (icon: React.ReactNode) => ({
  startAdornment: <InputAdornment position="start">{icon}</InputAdornment>,
});

/** A password box: a lock in front, and a reveal toggle behind. */
export const passwordInputProps = (
  visible: boolean,
  onToggle: () => void,
  toggleLabel: string,
) => ({
  ...startIcon(<LockOutlinedIcon fontSize="small" />),
  endAdornment: (
    <InputAdornment position="end">
      <DuncitIconButton size="small" onClick={onToggle} edge="end" aria-label={toggleLabel}>
        {visible ? (
          <VisibilityOffOutlinedIcon fontSize="small" />
        ) : (
          <VisibilityOutlinedIcon fontSize="small" />
        )}
      </DuncitIconButton>
    </InputAdornment>
  ),
});
