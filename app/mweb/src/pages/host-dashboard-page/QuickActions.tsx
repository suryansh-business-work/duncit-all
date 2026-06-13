import { useNavigate } from 'react-router-dom';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import type { ReactNode } from 'react';

interface Action {
  label: string;
  icon: ReactNode;
  to: string;
}

const ACTIONS: Action[] = [
  { label: 'Create pod', icon: <AddIcon />, to: '/create-pod' },
  { label: 'Your Pods', icon: <DashboardIcon />, to: '/host/manage' },
  { label: 'Verification', icon: <VerifiedUserIcon />, to: '/become-host' },
  { label: 'Wallet', icon: <AccountBalanceWalletIcon />, to: '/host/wallet' },
];

/** Host dashboard quick-action grid (B2-#5). */
export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {ACTIONS.map((action) => (
        <ButtonBase
          key={action.label}
          onClick={() => navigate(action.to)}
          sx={{
            flex: '1 1 120px',
            minWidth: 120,
            p: 1.5,
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexDirection: 'column',
            gap: 0.75,
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Box sx={{ color: 'primary.main', display: 'flex' }}>{action.icon}</Box>
          <Typography variant="caption" sx={{ fontWeight: 900 }}>
            {action.label}
          </Typography>
        </ButtonBase>
      ))}
    </Stack>
  );
}
