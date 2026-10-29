import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText } from '@mui/material';
import { FREE_POLICY_KEYS } from '@duncit/utils';

import type { Translate } from './schemas/translate';

export interface FreePolicyDialogProps {
  open: boolean;
  onClose: () => void;
  t: Translate;
  idPrefix: string;
}

/** "More details" on the free policy: how free pods and free venues work, point by point. */
export default function FreePolicyDialog({ open, onClose, t, idPrefix }: Readonly<FreePolicyDialogProps>) {
  const titleId = `${idPrefix}-free-policy-title`;
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} data-testid={`${idPrefix}-free-policy-dialog`}>
      <DialogTitle id={titleId}>{t(FREE_POLICY_KEYS.detailsTitle)}</DialogTitle>
      <DialogContent>
        <List dense disablePadding>
          {FREE_POLICY_KEYS.detailsPoints.map((key) => (
            <ListItem key={key} disableGutters>
              <ListItemText primary={t(key)} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} data-testid={`${idPrefix}-free-policy-close`}>
          {t(FREE_POLICY_KEYS.close)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
