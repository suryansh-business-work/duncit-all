import { useEffect, useState } from 'react';
import { recoveryResendSeconds } from '@duncit/utils';
import AuthBackground from '../../components/AuthBackground';
import AuthModeToggle from '../../components/AuthModeToggle';
import ForgotPasswordCard from './ForgotPasswordCard';
import { usePasswordRecovery } from './usePasswordRecovery';

/**
 * Forgotten-password recovery: choose a channel, prove the code, set the
 * password. RN twin: app/mobile-app/src/screens/ForgotPasswordScreen.tsx.
 */
export default function ForgotPasswordPage() {
  const recovery = usePasswordRecovery();
  const [resendIn, setResendIn] = useState(0);
  const { lastSentAt, resendAfterSeconds } = recovery.state;

  /*
    The cooldown ticks here rather than inside the step, so the step stays a
    form and re-rendering it once a second does not remount the boxes somebody
    is typing a code into. The interval only exists while there is something to
    count down.
  */
  useEffect(() => {
    if (lastSentAt === null) {
      setResendIn(0);
      return undefined;
    }
    const tick = () => setResendIn(recoveryResendSeconds({ lastSentAt, resendAfterSeconds }));
    tick();
    const timer = globalThis.setInterval(tick, 1000);
    return () => globalThis.clearInterval(timer);
  }, [lastSentAt, resendAfterSeconds]);

  return (
    <AuthBackground>
      <AuthModeToggle />
      <ForgotPasswordCard recovery={recovery} resendIn={resendIn} />
    </AuthBackground>
  );
}
