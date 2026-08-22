import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@apollo/client';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { SEND_TEST, type Tpl } from './queries';
import { emailTemplateTestSchema, type EmailTemplateTestValues } from './email-template-test';
import TestVariableFields, { type TestVariable } from './TestVariableFields';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  open: boolean;
  template: Tpl | null;
  /** Placeholders found in the MJML, which may not all be declared yet. */
  detected: string[];
  /** The Variables tab's JSON, used to seed the fields. */
  varsJson: string;
  onClose: () => void;
  onResult: (kind: 'success' | 'error', msg: string) => void;
}

/** A localization key is supplied by the send itself, not typed by an admin. */
const isTranslationKey = (key: string) => key.startsWith('t:');

function readJson(json: string): Record<string, string> {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]));
  } catch {
    return {};
  }
}

export default function SendTestDialog({
  open,
  template,
  detected,
  varsJson,
  onClose,
  onResult,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [sendTest, { loading }] = useMutation(SEND_TEST);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const { control, handleSubmit, watch, reset, formState } = useForm<EmailTemplateTestValues>({
    defaultValues: { to: '' },
    resolver: zodResolver(emailTemplateTestSchema),
    mode: 'onChange',
  });
  const to = watch('to');

  // Declared first, then anything the MJML uses that nobody declared — the
  // second list is the one that actually catches a missing value.
  const variables = useMemo<TestVariable[]>(() => {
    const declared = (template?.variables ?? []).map((v) => v.key).filter((k) => !isTranslationKey(k));
    const extra = detected.filter((k) => !isTranslationKey(k) && !declared.includes(k));
    return [
      ...declared.map((key) => ({ key })),
      ...extra.map((key) => ({ key, detectedOnly: true })),
    ];
  }, [template, detected]);

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    reset({ to: '' });
    // Seed from the template's samples, then from whatever the Variables tab
    // holds, so opening the dialog starts where the editor left off.
    const samples = Object.fromEntries(
      (template?.variables ?? [])
        .filter((v) => v.sample)
        .map((v) => [v.key, String(v.sample)])
    );
    setValues({ ...samples, ...readJson(varsJson) });
  }, [open, template, varsJson, reset]);

  const submit = handleSubmit(async (form) => {
    if (!template) return;
    setErrorMsg(null);
    // Only what this dialog offered. Sending the whole Variables-tab blob would
    // put localization keys and stale entries into a test of something else.
    const vars = Object.fromEntries(variables.map((v) => [v.key, values[v.key] ?? '']));
    try {
      const res = await sendTest({
        variables: { id: template.template_id, to: form.to, vars: JSON.stringify(vars) },
      });
      const r = res.data?.sendTestEmail;
      const message = r?.message || (r?.ok ? 'Sent' : 'Failed');
      onResult(r?.ok ? 'success' : 'error', message);
      if (r?.ok) onClose();
      else setErrorMsg(message);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('tech.emailTemplates.failedToSendTestEmail');
      onResult('error', message);
      setErrorMsg(message);
    }
  });

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form noValidate onSubmit={submit}>
        <DialogTitle>{t('tech.emailTemplates.sendTestEmail')}</DialogTitle>
        <DialogContent>
          <Controller
            control={control}
            name="to"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                autoFocus
                fullWidth
                required
                margin="normal"
                type="email"
                label="To"
                error={!!fieldState.error}
                helperText={fieldState.error?.message ?? ' '}
                disabled={loading}
              />
            )}
          />

          <Divider sx={{ my: 1 }} />

          <TestVariableFields
            variables={variables}
            values={values}
            onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
            disabled={loading}
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Sent through the same path as a real email — same header and footer, same provider —
            and recorded in Emails › Logs.
          </Typography>

          {errorMsg && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
              {errorMsg}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!template || loading || !to || !!formState.errors.to}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {loading ? 'Sending…' : 'Send'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
