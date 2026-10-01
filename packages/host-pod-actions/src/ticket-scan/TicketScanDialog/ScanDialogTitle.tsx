import { Box, DialogTitle, Typography } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

interface Props {
  heading: string;
  /** The pod being checked into — absent while the dialog is closed. */
  podTitle?: string;
}

/** The scanner's heading: what it does, and which pod it is doing it for. */
export default function ScanDialogTitle({ heading, podTitle }: Readonly<Props>) {
  return (
    <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
      <QrCodeScannerIcon color="primary" />
      <Box sx={{ minWidth: 0 }}>
        <Typography component="span" sx={{ fontWeight: 700, display: 'block' }}>
          {heading}
        </Typography>
        <Typography
          variant="caption"
          noWrap
          sx={{
            color: "text.secondary",
            display: "block"
          }}>
          {podTitle}
        </Typography>
      </Box>
    </DialogTitle>
  );
}
