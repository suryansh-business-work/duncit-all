import { Navigate, useSearchParams } from 'react-router';
import { Card, CardContent, Container } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useWebT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { SignInPanel } from '../../components/auth/SignInPanel';
import { paths } from '../../lib/paths';
import { usePageTitle } from '../../lib/usePageTitle';

/** A relative path only: an absolute `next` could send the reader off the site. */
const safeNext = (value: string | null): string => (value?.startsWith('/') && !value.startsWith('//') ? value : paths.discover);

/** /signin — the sign-in door as a page, for deep links; returns to `?next=` once signed in. */
export function SignInPage() {
  const { t } = useWebT();
  const { signedIn } = useLiteSession();
  const [params] = useSearchParams();
  usePageTitle(t('lite.auth.title'));
  if (signedIn) return <Navigate to={safeNext(params.get('next'))} replace />;
  return (
    <Container maxWidth="xs" disableGutters>
      <PageHeader title={t('lite.auth.title')} sx={{ mb: 2 }} />
      <Card>
        <CardContent>
          <SignInPanel />
        </CardContent>
      </Card>
    </Container>
  );
}
