import { issueCaptcha } from './captcha.service';

export const captchaResolvers = {
  Query: {
    /** No auth: the forms this protects are the ones with no session behind them. */
    captchaChallenge: () => issueCaptcha(),
  },
};
