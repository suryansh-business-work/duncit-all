import { Router } from 'express';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { trimTrailingSlash } from '@utils/url';
import { socialService } from './social.service';

/**
 * Where LinkedIn, Meta, X and Google send the browser back after the marketer
 * approves (or cancels) the connection.
 *
 * A REST route because the redirect is a browser navigation, not an API call.
 * The outcome goes back the only way a redirect can carry it — in the query
 * string of the Marketing page — and that page's address comes from config,
 * never from the request, so this can never be turned into an open redirect.
 */
export function buildSocialOAuthRouter(): Router {
  const router = Router();

  router.get('/callback', async (req, res) => {
    const { marketingUrl } = await getUrlConfigs();
    const destination = new URL(`${trimTrailingSlash(marketingUrl)}/social-accounts`);

    const denied = typeof req.query.error === 'string' ? req.query.error : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';

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
