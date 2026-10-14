import { Link, Stack } from '@mui/material';
import {
  recoveryHandoffFrom,
  type PasswordRecoveryChannel,
  type RecoveryHandoff,
  type SignInBoxes,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  channel: PasswordRecoveryChannel;
  /** The boxes as they stand at the moment of the press. */
  read: () => SignInBoxes;
  /** Absent: the form is used where there is no recovery to offer. */
  onPick?: (handoff: RecoveryHandoff) => void;
}

/**
 * "Forgot password?" under the password box. A button, not a route link: it
 * carries the tab and what was typed, so the code goes straight to that email
 * or that number. Native twin: forms/login/LoginForgotLink.
 */
export default function LoginForgotLink({ channel, read, onPick }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!onPick) return null;
  return (
    <Stack sx={{ alignItems: 'flex-end' }}>
      <Link
        component="button"
        type="button"
        onClick={() => onPick(recoveryHandoffFrom(channel, read()))}
        underline="hover"
        variant="body2"
        data-testid="go-forgot-password"
      >
        {t('mweb.login.forgotPassword')}
      </Link>
    </Stack>
  );
}
