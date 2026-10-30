import { Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { DuncitButton } from '@duncit/buttons';
import type { SmartIncentiveInfoLabels } from '@duncit/utils';

export type SmartIncentiveInfoDialogProps = Readonly<{
  open: boolean;
  onClose: () => void;
  labels: SmartIncentiveInfoLabels;
  /** Loyalty's delay before the offer shows, quoted in the first point. */
  delaySeconds: number;
}>;

/**
 * What Smart Incentive does and who pays for it, in four plain points. Opened
 * when a host switches the incentive on and again from "How it works", so the
 * host has read that the discount comes out of their own share before they
 * publish. Native twin: the Tamagui dialog beside the native editor.
 */
export function SmartIncentiveInfoDialog({ open, onClose, labels, delaySeconds }: SmartIncentiveInfoDialogProps) {
  const points = [
    { id: 'what', text: labels.what(delaySeconds) },
    { id: 'who', text: labels.who },
    { id: 'cut', text: labels.cut },
    { id: 'change', text: labels.change },
  ];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="smart-incentive-info-title"
      data-testid="smart-incentive-info"
    >
      <DialogTitle id="smart-incentive-info-title" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 900 }}>
        <CampaignOutlinedIcon color="primary" /> {labels.title}
      </DialogTitle>
      <DialogContent>
        <List dense disablePadding>
          {points.map((point) => (
            <ListItem key={point.id} disableGutters sx={{ alignItems: 'flex-start' }} data-testid={`smart-incentive-info-${point.id}`}>
              <ListItemIcon sx={{ minWidth: 30, mt: 0.5, color: 'success.main' }}>
                <CheckCircleOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={point.text} slotProps={{ primary: { variant: 'body2' } }} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <DuncitButton onClick={onClose} variant="contained" size="large" fullWidth data-testid="smart-incentive-info-close">
          {labels.gotIt}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
