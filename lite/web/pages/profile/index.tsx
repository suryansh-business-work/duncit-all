import { useNavigate } from 'react-router';
import { Card, CardContent, Container, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { SignedInGate } from '../../components/SignedInGate';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';
import { ProfileForm } from './profile-form';

function ProfileBody() {
  const { t } = useWebT();
  const { me, signOut } = useLiteSession();
  const navigate = useNavigate();
  if (!me) return null;
  const leave = async () => {
    try {
      await signOut();
      navigate(paths.discover);
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };
  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <ProfileForm key={me.id} me={me} />
        </CardContent>
      </Card>
      <DuncitButton variant="outlined" color="inherit" onClick={leave} sx={{ alignSelf: 'flex-start' }} data-testid="profile-sign-out">
        {t('lite.common.signOut')}
      </DuncitButton>
    </Stack>
  );
}

/** /profile — the reader's own account. */
export function ProfilePage() {
  const { t } = useWebT();
  usePageTitle(t('liteWeb.profile.title'));
  return (
    <Container maxWidth="sm" disableGutters>
      <Stack spacing={2} data-testid="profile-page">
        <PageHeader title={t('liteWeb.profile.title')} subtitle={t('liteWeb.profile.subtitle')} titleVariant="h4" />
        <SignedInGate body={t('liteWeb.profile.gate')}>
          <ProfileBody />
        </SignedInGate>
      </Stack>
    </Container>
  );
}
