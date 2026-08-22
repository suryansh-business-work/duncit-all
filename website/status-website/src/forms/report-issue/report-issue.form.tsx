import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, MenuItem, Stack } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { RhfTextField } from '@duncit/forms';
import { submitStatusReport } from '../../api';
import { useTranslation } from '../../i18n';
import type { ServiceGroup } from '../../types';
import { buildReportSchema } from './report-issue.schema';
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

export default function ReportIssueForm({
  groups,
  onSubmitted,
  onCancel,
}: Readonly<ReportIssueFormProps>) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const schema = useMemo(() => buildReportSchema(t), [t]);
  const { control, handleSubmit, formState } = useForm<ReportIssueValues>({
    resolver: zodResolver(schema),
    defaultValues: REPORT_DEFAULTS,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    setFailed(false);
    try {
      const ok = await submitStatusReport(values);
      if (ok) onSubmitted();
      else setFailed(true);
    } catch {
      setFailed(true);
    }
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
