import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BlockIcon from '@mui/icons-material/Block';
import { POD_AI_GUIDELINES } from './create-pod.form';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** "What AI monitors" dialog — the AI content check + the community guidelines
 * every pod must follow, and the consequences of breaking them. */
export default function PodGuidelinesDialog({ open, onClose }: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth data-testid="pod-guidelines-dialog">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900 }}>
        <AutoAwesomeIcon color="primary" /> What AI monitors
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {POD_AI_GUIDELINES.intro}
        </Typography>
        <List dense disablePadding>
          {POD_AI_GUIDELINES.rules.map((rule) => (
            <ListItem key={rule} disableGutters sx={{ alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 30, mt: 0.5, color: 'error.main' }}>
                <BlockIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={rule} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="error" sx={{ fontWeight: 700 }}>
            {POD_AI_GUIDELINES.warning}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" data-testid="pod-guidelines-close">
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
