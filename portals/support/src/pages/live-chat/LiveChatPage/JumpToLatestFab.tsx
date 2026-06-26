import { Fab } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

interface Props {
  show: boolean;
  onClick: () => void;
}

/** Floating "jump to latest" button — appears only when the agent has scrolled
 * up away from the newest message (B13). */
export default function JumpToLatestFab({ show, onClick }: Readonly<Props>) {
  if (!show) return null;
  return (
    <Fab
      size="small"
      color="primary"
      aria-label="Jump to latest"
      onClick={onClick}
      sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 2 }}
    >
      <KeyboardArrowDownIcon />
    </Fab>
  );
}
