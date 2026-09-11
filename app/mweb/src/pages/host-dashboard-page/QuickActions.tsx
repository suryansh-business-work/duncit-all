import { useTranslation } from '../../i18n/useTranslation';
import { useNavigate } from 'react-router';
import { Box, ButtonBase, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import type { ReactNode } from 'react';
import type { Translate } from '../../i18n/fallback';
import { SURFACE_SX } from '../../theme';
import { ICON_DISC_SX } from './StatCard';

interface Action {
  label: string;
  icon: ReactNode;
  to: string;
}

const actions = (t: Translate): Action[] => [
  { label: t('mweb.common.createPod'), icon: <AddIcon fontSize="small" />, to: '/create-pod' },
  { label: t('mweb.common.yourPods'), icon: <DashboardIcon fontSize="small" />, to: '/host/manage' },
  { label: t('mweb.common.verification'), icon: <VerifiedUserIcon fontSize="small" />, to: '/verification' },
  { label: t('mweb.common.wallet'), icon: <AccountBalanceWalletIcon fontSize="small" />, to: '/host/wallet' },
];

/** Host dashboard quick-action grid (B2-#5) — two tiles a row. */
export default function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
      {actions(t).map((action) => (
        <ButtonBase
          key={action.label}
          onClick={() => navigate(action.to)}
          sx={{ ...SURFACE_SX, p: 1.75, gap: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}
        >
          <Box sx={ICON_DISC_SX}>{action.icon}</Box>
          <Typography noWrap sx={{ minWidth: 0, fontSize: '0.875rem', fontWeight: 600 }}>
            {action.label}
          </Typography>
        </ButtonBase>
      ))}
    </Box>
  );
}
