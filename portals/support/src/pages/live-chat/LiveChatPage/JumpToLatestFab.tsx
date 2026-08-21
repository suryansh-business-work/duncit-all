import { Fab } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useTranslation } from '@duncit/shell';

interface Props {
  show: boolean;
  onClick: () => void;
}

/** Floating "jump to latest" button — appears only when the agent has scrolled
 * up away from the newest message (B13). */
export default function JumpToLatestFab({ show, onClick }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <Fab
      size="small"
      color="primary"
      aria-label={t('support.chat.jumpToLatest')}
      onClick={onClick}
      sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 2 }}
    >
      <KeyboardArrowDownIcon />
    </Fab>
  );
}
