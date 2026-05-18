import { ReactNode } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

export default function PartnerShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'transparent' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg" sx={{ py: 1.25 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack component={RouterLink} to="/" direction="row" alignItems="center" spacing={1.25} sx={{ color: 'inherit', textDecoration: 'none' }}>
              <Box component="img" src="/duncit-logo.svg" alt="Duncit" sx={{ height: 34, width: 'auto' }} />
              <Box>
                <Typography variant="subtitle1" fontWeight={900} lineHeight={1}>Partners</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Host and venue console</Typography>
              </Box>
            </Stack>
            <Button onClick={logout} startIcon={<LogoutIcon />} variant="outlined">Logout</Button>
          </Stack>
        </Container>
      </Box>
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 } }}>
        {children}
      </Container>
    </Box>
  );
}