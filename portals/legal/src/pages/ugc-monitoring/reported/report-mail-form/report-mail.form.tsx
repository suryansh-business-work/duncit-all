import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import {
  EMPTY_REPORT_MAIL,
  makeReportMailSchema,
  type ReportMailFormValues,
} from './report-mail.types';

interface Props {
  /** The dialog's Send button submits this form by id — it sits in the dialog's
   * actions bar, outside the <form> element. */
  formId: string;
  /** Changes each time the dialog opens for a new mail, which clears the form. */
  resetKey: string;
  disabled: boolean;
  onSubmit: (values: ReportMailFormValues) => Promise<void>;
}

type MailResolver = Resolver<ReportMailFormValues, unknown, ReportMailFormValues>;

/**
 * Subject and message for a mail about a content report.
 *
 * Both are required: the template only frames these words with the report's
 * reference, so an empty message would be an email that says nothing.
 */
export default function ReportMailForm({ formId, resetKey, disabled, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeReportMailSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<ReportMailFormValues, unknown, ReportMailFormValues>({
    resolver: zodResolver(schema) as unknown as MailResolver,
    defaultValues: EMPTY_REPORT_MAIL,
    mode: 'onTouched',
  });

  // One form instance serves every row and both recipients, so a mail written
  // to one person must not still be sitting there when the next one opens.
  useEffect(() => {
    reset(EMPTY_REPORT_MAIL);
  }, [resetKey, reset]);

  return (
    <form id={formId} data-testid="report-mail-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={1}>
        <RhfTextField
          control={control}
          name="subject"
          label={t('reportLogs.mailSubject')}
          placeholder={t('reportLogs.mailSubjectPlaceholder')}
          required
          disabled={disabled}
          slotProps={{ htmlInput: { 'data-testid': 'report-mail-subject' } }}
        />
        <RhfTextField
          control={control}
          name="message"
          label={t('reportLogs.mailMessage')}
          placeholder={t('reportLogs.mailMessagePlaceholder')}
          required
          multiline
          minRows={5}
          disabled={disabled}
          slotProps={{ htmlInput: { 'data-testid': 'report-mail-message' } }}
        />
      </Stack>
    </form>
  );
}
