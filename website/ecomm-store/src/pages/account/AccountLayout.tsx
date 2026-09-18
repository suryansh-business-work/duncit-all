import { useEffect, type ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';

import { useStoreSession } from '../../app/providers/SessionProvider';
import { EmptyState } from '../../components/EmptyState';
import { usePageSeo } from '../../lib/usePageSeo';
import { useStoreT } from '../../i18n';
import { AccountMenuList } from './AccountMenuList';

/** Signed-out visitors get the sign-in dialog instead of the page. */
function SignInGate() {
  const { t } = useStoreT();
  const { openSignIn } = useStoreSession();
  useEffect(() => openSignIn(), [openSignIn]);
  return (
    <EmptyState
      icon={<LockOutlinedIcon />}
      title={t('ecommStore.account.signInTitle')}
      body={t('ecommStore.account.signInBody')}
      action={
        <DuncitButton variant="contained" onClick={openSignIn}>
          {t('ecommStore.auth.signIn')}
        </DuncitButton>
      }
    />
  );
}

interface AccountLayoutProps {
  title: string;
  children: ReactNode;
  /** The profile page shows the menu itself, full width. */
  hideMenu?: boolean;
}

/** Account pages: signed-in only, with the list-row menu on the left on a desktop. */
export function AccountLayout({ title, children, hideMenu = false }: Readonly<AccountLayoutProps>) {
  const { t } = useStoreT();
  const { signedIn, resolving } = useStoreSession();
  usePageSeo(title);
  if (resolving) return <Loader label={t('ecommStore.common.loading')} />;
  if (!signedIn) return <SignInGate />;
  return (
    <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start' }}>
      {hideMenu ? null : (
        <Paper component="aside" sx={{ display: { xs: 'none', md: 'block' }, width: 300, flexShrink: 0, p: 1.5, position: 'sticky', top: 180 }}>
          <AccountMenuList />
        </Paper>
      )}
      <Stack spacing={2} sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="h1">{title}</Typography>
        <Box>{children}</Box>
      </Stack>
    </Stack>
  );
}
