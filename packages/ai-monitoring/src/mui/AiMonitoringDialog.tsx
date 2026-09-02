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
import { DuncitButton } from '@duncit/buttons';
import { AiMonitorGlyph } from './AiMonitorGlyph';
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
 *
 * The title carries the live {@link AiMonitorGlyph} rather than a still icon:
 * this dialog opens from a chip that was moving, and a badge that stopped on
 * arrival would read as the chip having been a link to somewhere else.
 */
export function AiMonitoringDialog({ open, onClose, copy }: Readonly<AiMonitoringDialogProps>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <AiMonitorGlyph size={26} />
          <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
            {copy.title}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {copy.intro}
        </Typography>
        <List dense disablePadding sx={{ mt: 1 }}>
          {copy.points.map((point) => (
            <ListItem key={point} disableGutters alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                <CheckCircleOutlineIcon fontSize="small" color="success" />
              </ListItemIcon>
              <ListItemText primary={point} slotProps={{ primary: { variant: 'body2' } }} />
            </ListItem>
          ))}
        </List>
        {copy.footnote && (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mt: 1 }}
          >
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
