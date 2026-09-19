import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { notify } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { PROVIDER_LABEL } from './copy';
import type { SocialProvider } from './queries';

const CANCELLED = new Set(['access_denied', 'user_cancelled_authorize', 'user_cancelled_login']);
const PROVIDER_KEYS = new Set<string>(Object.keys(PROVIDER_LABEL));
const isProvider = (value: string): value is SocialProvider => PROVIDER_KEYS.has(value);

/**
 * The server's OAuth callback lands the marketer back here with the outcome in
 * the query string. Say it once, then take it out of the URL so a reload does
 * not announce the same connection again.
 */
export function useConnectResult(onConnected: () => void) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const connected = params.get('connected') ?? '';
  const error = params.get('social_error') ?? '';
  const count = Number(params.get('count') ?? 0);

  useEffect(() => {
    if (!connected && !error) return;
    if (isProvider(connected)) {
      const provider = t(PROVIDER_LABEL[connected]);
      if (count > 0) {
        notify(t('marketing.social.connectedToast', { count, vars: { provider } }), 'success');
      } else {
        notify(t('marketing.social.noneFound', { vars: { provider } }), 'warning');
      }
      onConnected();
    } else if (CANCELLED.has(error)) {
      notify(t('marketing.social.connectCancelled'), 'info');
    } else if (error) {
      notify(t('marketing.social.connectFailed', { vars: { reason: error } }), 'error');
    }
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        ['connected', 'count', 'social_error'].forEach((key) => next.delete(key));
        return next;
      },
      { replace: true }
    );
  }, [connected, error, count, t, onConnected, setParams]);
}
