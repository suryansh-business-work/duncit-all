import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DescriptionIcon from '@mui/icons-material/Description';
import ArticleIcon from '@mui/icons-material/Article';
import EmailIcon from '@mui/icons-material/Email';
import type { TranscriptFormat } from '../graphql/supportChat';

interface Props {
  onDownload: (format: TranscriptFormat) => void;
  onEmail: (email: string) => void;
  busy?: boolean;
}

/** Agent transcript actions — Download .txt / .docx and Email, shared by the
 * live-chat thread and the ticket detail page. */
export default function TranscriptMenu({ onDownload, onEmail, busy }: Readonly<Props>) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');

  const close = () => setAnchor(null);

  const download = (format: TranscriptFormat) => {
    close();
    onDownload(format);
  };

  const sendEmail = () => {
    onEmail(email.trim());
    setEmailOpen(false);
    setEmail('');
  };

  return (
    <>
      <Tooltip title="Export transcript">
        {/* Guard the open instead of `disabled` so the Tooltip keeps a non-disabled
            child (MUI can't attach listeners to a disabled element). */}
        <IconButton
          size="small"
          aria-label="Export transcript"
          onClick={(e) => {
            if (!busy) setAnchor(e.currentTarget);
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={() => download('TXT')}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download .txt</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => download('DOCX')}>
          <ListItemIcon>
            <ArticleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download .docx</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            setEmailOpen(true);
          }}
        >
          <ListItemIcon>
            <EmailIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Email transcript…</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={emailOpen} onClose={() => setEmailOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Email transcript</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="email"
            size="small"
            label="Recipient email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mt: 1 }}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!email.trim()} onClick={sendEmail}>
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
