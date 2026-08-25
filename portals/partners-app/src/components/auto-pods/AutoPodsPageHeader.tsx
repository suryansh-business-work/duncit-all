import HandshakeIcon from '@mui/icons-material/Handshake';
import { Stack, Typography } from '@mui/material';

export interface AutoPodsPageHeaderProps {
  title: string;
}

/**
 * Title row for the three Auto Pod pages — the same shape Verification and Earn
 * open with, so every partner page in this portal starts the same way.
 */
export default function AutoPodsPageHeader({ title }: Readonly<AutoPodsPageHeaderProps>) {
  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      <HandshakeIcon color="primary" />
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          lineHeight: 1
        }}>
        {title}
      </Typography>
    </Stack>
  );
}
