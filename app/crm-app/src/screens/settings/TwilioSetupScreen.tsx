import { useState } from 'react';

import { FormLayout } from '@/components/mobile/FormLayout';
import { StateView } from '@/components/StateView';
import { hasSavedToken, twilioFormValues } from '@/features/twilio/twilioConfig';
import { useTwilioSetup } from '@/features/twilio/useTwilioSetup';
import { EnvAccessForm } from '@/forms/env-access';
import { TwilioConfigForm, type TwilioConfigValues } from '@/forms/twilio-config';
import { useTranslation } from '@/hooks/useTranslation';
import { haptics } from '@/services/haptics';
import { errorMessage } from '@/utils/errors';

type Result = { message: string; ok: boolean } | null;

/**
 * Settings › Twilio: the CRM call line's account, token and numbers, edited
 * in the app with the Tech portal's own protection — only a SUPER_ADMIN or
 * TECH_MANAGER gets in (the server refuses anyone else), after unlocking this
 * session with the code emailed to the root admin. Save, then test it.
 */
export function TwilioSetupScreen() {
  const { t } = useTranslation();
  const setup = useTwilioSetup(t);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [testing, setTesting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const failed = (err: unknown) => errorMessage(err, t('crmApp.common.saveFailed'));

  const { status, entries } = setup;
  if (!status.data) {
    return <StateView loading={!status.error} error={status.error} onRetry={status.refetch} />;
  }

  if (!setup.unlocked) {
    const sendCode = async () => {
      setError(null);
      try {
        await setup.requestCode();
      } catch (err) {
        setError(failed(err));
      }
    };
    const unlock = async ({ code }: { code: string }) => {
      setError(null);
      try {
        await setup.verify(code);
        haptics.success();
      } catch (err) {
        haptics.error();
        setError(failed(err));
      }
    };
    return (
      <FormLayout testID="twilio-unlock">
        <EnvAccessForm
          sentTo={setup.sentTo}
          codeSent={setup.challenge !== null}
          onSendCode={sendCode}
          onSubmit={unlock}
          error={error}
        />
      </FormLayout>
    );
  }

  if (!entries.data) {
    return <StateView loading={!entries.error} error={entries.error} onRetry={entries.refetch} />;
  }

  const entryId = setup.entry?.id ?? savedId;
  const save = async (values: TwilioConfigValues) => {
    setResult(null);
    try {
      setSavedId(await setup.save(values));
      haptics.success();
      setResult({ message: t('crmApp.twilio.saved'), ok: true });
    } catch (err) {
      haptics.error();
      setResult({ message: failed(err), ok: false });
    }
  };
  const test = async () => {
    if (!entryId) return;
    setTesting(true);
    try {
      const outcome = await setup.test(entryId);
      setResult({ message: outcome.message, ok: outcome.ok });
    } catch (err) {
      setResult({ message: failed(err), ok: false });
    } finally {
      setTesting(false);
    }
  };
  return (
    <TwilioConfigForm
      key={setup.entry?.id ?? 'new'}
      initial={twilioFormValues(setup.entry)}
      tokenSaved={hasSavedToken(setup.entry)}
      onSave={save}
      onTest={entryId ? test : undefined}
      testing={testing}
      result={result}
    />
  );
}
