import { Router } from 'express';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { trimTrailingSlash } from './gmail.oauth';
import { mailAutomationService } from './mailAutomation.service';

/**
 * Where Google sends the browser back after the operator picks a mailbox.
 *
 * A REST route rather than a mutation because the OAuth redirect is a browser
 * navigation, not an API call — Google decides when it happens and nothing in
 * the portal is holding a request open for it. It hands the outcome back the
 * only way a redirect can: in the query string of the page it lands on.
 *
 * The return address is read from config, never from the request. A callback
 * that redirects wherever it is told is an open redirect with an OAuth code
 * attached to it.
 */
export function buildGmailOAuthRouter(): Router {
  const router = Router();

  router.get('/oauth/callback', async (req, res) => {
    const { techUrl } = await getUrlConfigs();
    const destination = new URL(`${trimTrailingSlash(techUrl)}/mail-automation`);

    const denied = typeof req.query.error === 'string' ? req.query.error : '';
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';

    if (denied || !code || !state) {
      // `access_denied` is the operator clicking Cancel, which is not an
      // incident — the page says so and offers the button again.
      destination.searchParams.set('error', denied || 'missing_code');
      res.redirect(destination.toString());
      return;
    }

    try {
      const result = await mailAutomationService.completeConnect(code, state);
      destination.searchParams.set('connected', result.account.email);
      // The page warns rather than congratulates: the operator has just
      // re-authorised a mailbox that was already set up, and the thing they
      // will want to know is whether its rule survived.
      if (result.alreadyConnected) destination.searchParams.set('reconnected', '1');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logs.server.error('mail-automation', 'oauthCallback', {
        error,
        msg: 'could not complete the Gmail connection',
      });
      // Generous: Google's actionable errors name the project and carry the
      // console URL that fixes them, and a message cut off before that URL is
      // a message that has thrown away its own answer.
      destination.searchParams.set('error', reason.slice(0, 700));
    }
    res.redirect(destination.toString());
  });

  return router;
}
