import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../../shared/i18n';
import { useLiteSession } from '../../../../shared/session';
import { LITE_REQUEST_CONTACT_CODE, LITE_VERIFY_CONTACT, type LiteContactKind } from '../../../graphql/profile';
import { makeContactCodeSchema, makeContactValueSchema, type ContactCodeValues, type ContactValueValues } from './contact.types';

interface ContactFormProps {
  kind: LiteContactKind;
  open: boolean;
  onClose: () => void;
}

/** Add or change the email or phone on the account: the new one is proved by a code sent to it. */
export function ContactForm({ kind, open, onClose }: Readonly<ContactFormProps>) {
  const { t } = useWebT();
  const { refresh } = useLiteSession();
  const titleId = useId();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [stubCode, setStubCode] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const valueSchema = useMemo(() => makeContactValueSchema(t, kind), [t, kind]);
  const codeSchema = useMemo(() => makeContactCodeSchema(t), [t]);
  const valueForm = useForm<ContactValueValues>({ resolver: zodResolver(valueSchema), defaultValues: { value: '' } });
  const codeForm = useForm<ContactCodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });
  const [requestCode] = useMutation(LITE_REQUEST_CONTACT_CODE);
  const [verify] = useMutation(LITE_VERIFY_CONTACT);
  const label = t(kind === 'EMAIL' ? 'lite.auth.email' : 'liteWeb.settings.phone');

  const close = () => {
    setSentTo(null);
    setStubCode(null);
    setProblem('');
    valueForm.reset();
    codeForm.reset();
    onClose();
  };

  const send = valueForm.handleSubmit(async ({ value }) => {
    setProblem('');
    try {
      const { data } = await requestCode({ variables: { kind, value } });
      setStubCode(data?.liteRequestContactCode.test_code ?? null);
      setSentTo(value);
    } catch (error) {
      setProblem(parseApiError(error));
    }
  });

  const confirm = codeForm.handleSubmit(async ({ code }) => {
    if (!sentTo) return;
    setProblem('');
    try {
      await verify({ variables: { kind, value: sentTo, code } });
      await refresh();
      notifySuccess(t('liteWeb.settings.contactSaved'));
      close();
    } catch (error) {
      setProblem(parseApiError(error));
    }
  });

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby={titleId} data-testid="contact-dialog">
      <DialogTitle id={titleId}>{t(kind === 'EMAIL' ? 'liteWeb.settings.changeEmail' : 'liteWeb.settings.changePhone')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {sentTo ? (
            <Stack component="form" spacing={2} onSubmit={confirm} noValidate data-testid="contact-code-form">
              <Alert severity="info">{t('liteWeb.settings.codeSent', { vars: { to: sentTo } })}</Alert>
              {stubCode ? <Alert severity="warning">{t('lite.auth.testCode', { vars: { code: stubCode } })}</Alert> : null}
              <RhfTextField control={codeForm.control} name="code" label={t('lite.auth.code')} autoComplete="one-time-code" slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6, 'data-testid': 'contact-code' } }} />
              <DuncitButton type="submit" variant="contained" loading={codeForm.formState.isSubmitting} data-testid="contact-verify">
                {t('liteWeb.settings.verify')}
              </DuncitButton>
            </Stack>
          ) : (
            <Stack component="form" spacing={2} onSubmit={send} noValidate data-testid="contact-value-form">
              <RhfTextField
                control={valueForm.control}
                name="value"
                label={label}
                autoComplete={kind === 'EMAIL' ? 'email' : 'tel'}
                slotProps={{ htmlInput: { inputMode: kind === 'EMAIL' ? 'email' : 'tel', maxLength: kind === 'EMAIL' ? 254 : 20, 'data-testid': 'contact-value' } }}
              />
              <DuncitButton type="submit" variant="contained" loading={valueForm.formState.isSubmitting} data-testid="contact-send">
                {t('liteWeb.settings.sendCode')}
              </DuncitButton>
            </Stack>
          )}
          <Stack aria-live="assertive">{problem ? <Alert severity="error">{problem}</Alert> : null}</Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
