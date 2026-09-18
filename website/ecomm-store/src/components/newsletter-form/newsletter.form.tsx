import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { CaptchaField, useCaptcha } from '@duncit/captcha/mui';
import { RhfTextField } from '@duncit/forms';
import { captchaCopy } from '@duncit/i18n';
import { parseApiError } from '@duncit/utils';

import { SUBSCRIBE_NEWSLETTER } from '../../graphql/account';
import { useStoreSession } from '../../app/providers/SessionProvider';
import { GRAPHQL_URL } from '../../config/env';
import { useStoreT } from '../../i18n';
import { makeNewsletterSchema, type NewsletterValues } from './newsletter.types';

interface Outcome {
  severity: 'success' | 'error';
  message: string;
}

/** Newsletter signup for the footer and the home page's NEWSLETTER section. */
export function NewsletterForm({ source }: Readonly<{ source: 'WEBSITE_FOOTER' | 'WEBSITE_PAGE' }>) {
  const { t } = useStoreT();
  const { signedIn } = useStoreSession();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const schema = useMemo(() => makeNewsletterSchema(t, !signedIn), [t, signedIn]);
  // The shared human check — the same server-drawn code every public site uses.
  const captcha = useCaptcha(GRAPHQL_URL);
  const [subscribe] = useMutation(SUBSCRIBE_NEWSLETTER);
  const { control, handleSubmit, reset, formState } = useForm<NewsletterValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', captcha: '' },
  });

  const submit = handleSubmit(async ({ email, captcha: answer }) => {
    setOutcome(null);
    try {
      const { data } = await subscribe({
        variables: {
          input: {
            email,
            source,
            ...(signedIn ? {} : { captcha_token: captcha.token, captcha_answer: answer }),
          },
        },
      });
      const result = data?.subscribeNewsletter;
      setOutcome({ severity: result?.ok ? 'success' : 'error', message: result?.message ?? '' });
      if (result?.ok) reset({ email: '', captcha: '' });
    } catch (error) {
      setOutcome({ severity: 'error', message: parseApiError(error, t('ecommStore.newsletter.failed')) });
    } finally {
      // A used code is a spent code.
      if (!signedIn) captcha.reload();
    }
  });

  return (
    <Stack component="form" spacing={1.5} onSubmit={submit} noValidate>
      <RhfTextField
        control={control}
        name="email"
        type="email"
        autoComplete="email"
        label={t('ecommStore.newsletter.emailLabel')}
        hint={t('ecommStore.newsletter.emailHint')}
      />
      {signedIn ? null : <CaptchaField control={control} name="captcha" captcha={captcha} copy={captchaCopy(t)} />}
      <DuncitButton type="submit" variant="contained" loading={formState.isSubmitting}>
        {t('ecommStore.newsletter.subscribe')}
      </DuncitButton>
      <Stack aria-live="polite">
        {outcome?.message ? <Alert severity={outcome.severity}>{outcome.message}</Alert> : null}
      </Stack>
    </Stack>
  );
}
