import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, MenuItem, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { RhfTextField } from '@duncit/forms';
import { captchaCopy } from '@duncit/i18n';
import { captchaErrorCode } from '@duncit/captcha';
import { CaptchaField, useCaptcha } from '@duncit/captcha/mui';
import { submitStatusReport, type StatusReportOutcome } from '../../api';
import { SERVER_BASE } from '../../config/server';
import { useTranslation } from '../../i18n';
import type { ServiceGroup } from '../../types';
import { buildReportSchema } from './report-issue.schema';
import ScreenshotField from './ScreenshotField';
import { useScreenshots } from './useScreenshots';
import {
  IMPACT_OPTIONS,
  REPORT_DEFAULTS,
  type ReportIssueValues,
} from './report-issue.types';

interface ReportIssueFormProps {
  /** The live service catalogue, so the dropdown names what the board names. */
  groups: ServiceGroup[] | null;
  onSubmitted: () => void;
  onCancel: () => void;
}

const GRAPHQL_URL = `${SERVER_BASE}/graphql`;

export default function ReportIssueForm({
  groups,
  onSubmitted,
  onCancel,
}: Readonly<ReportIssueFormProps>) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const schema = useMemo(() => buildReportSchema(t), [t]);
  const captcha = useCaptcha(GRAPHQL_URL);
  const screenshots = useScreenshots(t);
  const { control, handleSubmit, formState, resetField, setError } = useForm<ReportIssueValues>({
    resolver: zodResolver(schema),
    defaultValues: REPORT_DEFAULTS,
    mode: 'onTouched',
  });

  const copy = useMemo(() => captchaCopy(t), [t]);

  const submit = handleSubmit(async (values) => {
    setFailed(false);
    let outcome: StatusReportOutcome;
    try {
      outcome = await submitStatusReport({
        ...values,
        images: screenshots.shots.map(({ file_name, data, mime_type }) => ({
          file_name,
          data,
          mime_type,
        })),
        captcha_token: captcha.token,
      });
    } catch {
      setFailed(true);
      return;
    }
    if (outcome.ok) {
      // The form is unmounted from here, and a fresh mount mints its own code.
      screenshots.clear();
      onSubmitted();
      return;
    }
    // A spent code cannot be reused, right or wrong, so the next attempt needs
    // a new one — and the field it was typed into is cleared with it.
    captcha.reload();
    resetField('captcha_answer');
    const code = captchaErrorCode(outcome.errors);
    if (code) {
      setError('captcha_answer', { message: copy[code] });
      return;
    }
    setFailed(true);
  });

  const services = groups?.flatMap((group) => group.items) ?? [];
  const submitting = formState.isSubmitting;

  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate>
      {failed && <Alert severity="error">{t('status.report.failure')}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="service_key"
          select
          size="small"
          label={t('status.report.service')}
        >
          <MenuItem value="">{t('status.report.serviceUnknown')}</MenuItem>
          {services.map((service) => (
            <MenuItem key={service.key} value={service.key}>
              {service.name}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfTextField
          control={control}
          name="impact"
          select
          size="small"
          label={t('status.report.impact')}
        >
          {IMPACT_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(option.labelKey)}
            </MenuItem>
          ))}
        </RhfTextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="name"
          size="small"
          label={t('status.report.name')}
          autoComplete="name"
        />
        <RhfTextField
          control={control}
          name="email"
          size="small"
          type="email"
          label={t('status.report.email')}
          hint={t('status.report.emailHelp')}
          autoComplete="email"
        />
      </Stack>
      <RhfTextField
        control={control}
        name="page_url"
        size="small"
        label={t('status.report.pageUrl')}
        hint={t('status.report.pageUrlHelp')}
      />
      <RhfTextField
        control={control}
        name="message"
        size="small"
        multiline
        minRows={4}
        label={t('status.report.message')}
        hint={t('status.report.messageHelp')}
      />
      <ScreenshotField
        shots={screenshots.shots}
        error={screenshots.error}
        disabled={submitting}
        onAdd={screenshots.add}
        onRemove={screenshots.remove}
      />
      <CaptchaField control={control} name="captcha_answer" captcha={captcha} copy={copy} />
      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        <Button onClick={onCancel} disabled={submitting} color="inherit">
          {t('status.report.cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          startIcon={<SendIcon />}
        >
          {submitting ? t('status.report.submitting') : t('status.report.submit')}
        </Button>
      </Stack>
    </Stack>
  );
}
