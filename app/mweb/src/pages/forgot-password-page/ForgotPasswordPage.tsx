import AuthBackground from '../../components/AuthBackground';
import ForgotPasswordCard from './ForgotPasswordCard';
import { usePasswordRecovery } from './usePasswordRecovery';

/**
 * Forgotten-password recovery: choose a channel, prove the code, set the
 * password. The cooldown ticks inside the shared send-a-code hook. RN twin:
 * app/mobile-app/src/screens/ForgotPasswordScreen.
 */
export default function ForgotPasswordPage() {
  const recovery = usePasswordRecovery();

  return (
    <AuthBackground>
      <ForgotPasswordCard recovery={recovery} resendIn={recovery.resendIn} />
    </AuthBackground>
  );
}
