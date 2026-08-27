import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { DuncitButton } from '@duncit/buttons';
import type { AiMonitoringCopy } from '../index';

export interface AiMonitoringDialogProps {
  open: boolean;
  onClose: () => void;
  copy: AiMonitoringCopy;
}

/**
 * What "AI Monitoring" means, in the reader's language.
 *
 * Purely informational — it explains, it never gates the upload. Every
 * sentence comes from `copy`, which is the admin's setting layered over the
 * localized fallback, so this component holds no text of its own.
 */
export function AiMonitoringDialog({ open, onClose, copy }: Readonly<AiMonitoringDialogProps>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <SmartToyIcon color="primary" fontSize="small" />
          <Typography component="span" variant="h6" sx={{
            fontWeight: 700
          }}>
            {copy.title}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {copy.intro}
        </Typography>
        <List dense disablePadding sx={{ mt: 1 }}>
          {copy.points.map((point) => (
            <ListItem key={point} disableGutters alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                <CheckCircleOutlineIcon fontSize="small" color="success" />
              </ListItemIcon>
              <ListItemText primary={point} slotProps={{
                primary: { variant: 'body2' }
              }} />
            </ListItem>
          ))}
        </List>
        {copy.footnote && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              display: 'block',
              mt: 1
            }}>
            {copy.footnote}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} variant="contained">
          {copy.dismissLabel}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
