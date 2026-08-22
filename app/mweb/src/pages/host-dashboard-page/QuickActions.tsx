import { useTranslation } from '../../i18n/useTranslation';
import { useNavigate } from 'react-router-dom';
import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import type { ReactNode } from 'react';
import type { Translate } from '../../i18n/fallback';

interface Action {
  label: string;
  icon: ReactNode;
  to: string;
}

const actions = (t: Translate): Action[] => [
  { label: t('mweb.common.createPod'), icon: <AddIcon />, to: '/create-pod' },
  { label: t('mweb.common.yourPods'), icon: <DashboardIcon />, to: '/host/manage' },
  { label: t('mweb.common.verification'), icon: <VerifiedUserIcon />, to: '/verification' },
  { label: t('mweb.common.wallet'), icon: <AccountBalanceWalletIcon />, to: '/host/wallet' },
];

/** Host dashboard quick-action grid (B2-#5). */
export default function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {actions(t).map((action) => (
        <ButtonBase
          key={action.label}
          onClick={() => navigate(action.to)}
          sx={{
            flex: '1 1 120px',
            minWidth: 120,
            p: 1.5,
            borderRadius: '16px',
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexDirection: 'column',
            gap: 0.75,
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          <Box sx={{ color: 'primary.main', display: 'flex' }}>{action.icon}</Box>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {action.label}
          </Typography>
        </ButtonBase>
      ))}
    </Stack>
  );
}
