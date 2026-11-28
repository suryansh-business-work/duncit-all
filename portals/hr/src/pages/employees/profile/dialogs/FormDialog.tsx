import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface Props {
  open: boolean;
  title: string;
  /** Unique per dialog: names the title for screen readers. */
  id: string;
  onClose: () => void;
  children: ReactNode;
}

/** A profile form in a dialog: full screen on a phone, a wide modal elsewhere. */
export default function FormDialog({ open, title, id, onClose, children }: Readonly<Props>) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" fullScreen={fullScreen} aria-labelledby={`${id}-title`}>
      <DialogTitle id={`${id}-title`}>{title}</DialogTitle>
      <DialogContent dividers>{open ? children : null}</DialogContent>
    </Dialog>
  );
}
