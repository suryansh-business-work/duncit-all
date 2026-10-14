import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { DIAL_CODE, EMAIL, PHONE_INTL } from '@duncit/regex';
import { readRecoveryHandoff, recoveryHandoffSendable } from '@duncit/utils';
import AuthBackground from '../../components/AuthBackground';
import ForgotPasswordCard from './ForgotPasswordCard';
import { usePasswordRecovery } from './usePasswordRecovery';

const SHAPES = { email: EMAIL, extension: DIAL_CODE, number: PHONE_INTL };

/**
 * Forgotten-password recovery: choose a channel, prove the code, set the
 * password. The cooldown ticks inside the shared send-a-code hook. RN twin:
 * app/mobile-app/src/screens/ForgotPasswordScreen.
 *
 * Opened from "Forgot password?" beside the password box, it arrives holding
 * that step's tab and what was typed there: an email gets its code by email, a
 * number by phone, sent at once — the person already said where. A blank or
 * malformed box opens the same tab with the value filled in instead.
 */
export default function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // Read once, on the first render: the state is cleared below so a reload
  // cannot send a second code.
  const [handoff] = useState(() =>
    readRecoveryHandoff((location.state as { recovery?: unknown } | null)?.recovery),
  );
  const recovery = usePasswordRecovery(handoff);
  const spent = useRef(false);

  useEffect(() => {
    if (!handoff || spent.current) return;
    spent.current = true;
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    if (recoveryHandoffSendable(handoff, SHAPES)) {
      recovery.sendCode(handoff.draft).catch(() => undefined);
    }
    // Once per arrival; the handoff is fixed for this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthBackground>
      <ForgotPasswordCard recovery={recovery} resendIn={recovery.resendIn} />
    </AuthBackground>
  );
}
