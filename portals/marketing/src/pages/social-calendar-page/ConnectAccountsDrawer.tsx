import { useId } from 'react';
import { Drawer, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import AccountsTab from '../social-accounts-page/accounts/AccountsTab';
import type { SocialAccount, SocialProviderStatus } from '../social-accounts-page/queries';

interface Props {
  open: boolean;
  providers: SocialProviderStatus[];
  accounts: SocialAccount[];
  onChanged: () => void;
  onClose: () => void;
}

/**
 * The Social Accounts connect settings, beside the calendar: the same cards,
 * and a connection made here comes back to the calendar.
 */
export default function ConnectAccountsDrawer({ open, providers, accounts, onChanged, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { 'aria-labelledby': titleId, sx: { width: { xs: '100%', md: 560 } } } }}>
      <Stack spacing={2} sx={{ p: 2 }} data-testid="social-calendar-accounts">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography id={titleId} variant="h6" component="h2" sx={{ flex: 1 }}>
            {t('marketing.socialCalendar.accountsTitle')}
          </Typography>
          <Tooltip title={t('shell.common.close')}>
            <DuncitIconButton onClick={onClose}>
              <CloseIcon />
            </DuncitIconButton>
          </Tooltip>
        </Stack>
        <AccountsTab providers={providers} accounts={accounts} onChanged={onChanged} returnTo="CALENDAR" narrow />
      </Stack>
    </Drawer>
  );
}
