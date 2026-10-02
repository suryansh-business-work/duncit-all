import { Router } from 'express';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { trimTrailingSlash } from '@utils/url';
import { socialService } from './social.service';
import { readConnectState } from './social.oauth';
import type { SocialConnectReturn } from './social.types';

const RETURN_PATH: Record<SocialConnectReturn, string> = {
  ACCOUNTS: '/social-accounts',
  CALENDAR: '/social-calendar',
};

/**
 * Where LinkedIn, Meta, X and Google send the browser back after the marketer
 * approves (or cancels) the connection.
 *
 * A REST route because the redirect is a browser navigation, not an API call.
 * The outcome goes back the only way a redirect can carry it — in the query
 * string of the Marketing page — and that page's address comes from config
 * plus a fixed path picked by the SIGNED state, never from the request, so this
 * can never be turned into an open redirect. A state that does not verify
 * cannot say which page it came from, so it lands on Social Accounts.
 */
export function buildSocialOAuthRouter(): Router {
  const router = Router();

  router.get('/callback', async (req, res) => {
    const denied = typeof req.query.error === 'string' ? req.query.error : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';

    const { marketingUrl } = await getUrlConfigs();
    const returnTo = readConnectState(state)?.returnTo ?? 'ACCOUNTS';
    const destination = new URL(`${trimTrailingSlash(marketingUrl)}${RETURN_PATH[returnTo]}`);

    if (denied || !code || !state) {
      // `access_denied` / `user_cancelled_authorize` is the marketer pressing
      // Cancel — the page says so and offers the button again.
      destination.searchParams.set('social_error', denied || 'missing_code');
      res.redirect(destination.toString());
      return;
    }

    try {
      const result = await socialService.completeConnect(code, state);
      destination.searchParams.set('connected', result.provider);
      destination.searchParams.set('count', String(result.count));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logs.server.error('social-accounts', 'oauthCallback', { error, msg: 'could not complete the social connection' });
      destination.searchParams.set('social_error', reason.slice(0, 500));
    }
    res.redirect(destination.toString());
  });

  return router;
}
