import type { ReactNode } from 'react';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useWebT } from '../../shared/i18n';
import { useLiteSession } from '../../shared/session';
import { useSignInPrompt } from '../app/providers/SignInPromptProvider';
import { EmptyState } from './EmptyState';
import { PageSkeleton } from './skeletons';

interface SignedInGateProps {
  /** What the page is for, shown on the sign-in prompt. */
  body?: string;
  /** Drawn while the session is still being checked: the page's own skeleton (a plain page shape when absent). */
  skeleton?: ReactNode;
  children: ReactNode;
}

/** Renders the page for a signed-in reader; asks everyone else to sign in first. */
export function SignedInGate({ body, skeleton, children }: Readonly<SignedInGateProps>) {
  const { t } = useWebT();
  const { signedIn, resolving } = useLiteSession();
  const { openSignIn } = useSignInPrompt();
  if (resolving) return skeleton ?? <PageSkeleton />;
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
