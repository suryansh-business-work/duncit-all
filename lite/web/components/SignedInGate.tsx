import type { ReactNode } from 'react';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { DuncitButton } from '@duncit/buttons';
import { Loader } from '@duncit/ui';
import { useWebT } from '../../shared/i18n';
import { useLiteSession } from '../../shared/session';
import { useSignInPrompt } from '../app/providers/SignInPromptProvider';
import { EmptyState } from './EmptyState';

interface SignedInGateProps {
  /** What the page is for, shown on the sign-in prompt. */
  body?: string;
  children: ReactNode;
}

/** Renders the page for a signed-in reader; asks everyone else to sign in first. */
export function SignedInGate({ body, children }: Readonly<SignedInGateProps>) {
  const { t } = useWebT();
  const { signedIn, resolving } = useLiteSession();
  const { openSignIn } = useSignInPrompt();
  if (resolving) return <Loader label={t('lite.common.loading')} />;
  if (!signedIn) {
    return (
      <EmptyState
        icon={<LockOutlinedIcon />}
        title={t('liteWeb.gate.title')}
        body={body ?? t('liteWeb.gate.body')}
        testId="signed-in-gate"
        action={
          <DuncitButton variant="contained" onClick={openSignIn} data-testid="gate-sign-in">
            {t('lite.common.signIn')}
          </DuncitButton>
        }
      />
    );
  }
  return <>{children}</>;
}
