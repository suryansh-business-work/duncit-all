import { useNavigate } from 'react-router-dom';
import { Box, Stack } from '@mui/material';

interface HeaderBrandProps {
  logoUrl?: string | null;
  appName?: string | null;
}

export default function HeaderBrand({ logoUrl, appName }: HeaderBrandProps) {
  const navigate = useNavigate();
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ cursor: 'pointer', minWidth: 0 }}
      onClick={() => navigate('/')}
      role="button"
      tabIndex={0}
      aria-label="Go to home"
    >
      <Box
        component="img"
        src={logoUrl || '/duncit-logo.svg'}
        alt={appName ?? 'Duncit'}
        sx={{
          height: 36,
          width: 'auto',
          maxWidth: 128,
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </Stack>
  );
}
