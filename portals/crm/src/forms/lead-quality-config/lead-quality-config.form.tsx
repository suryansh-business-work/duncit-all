import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertTitle, Box, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { toConfigInput, valuesFromConfig } from './lead-quality-config.convert';
import { formFieldName, isLeafPath, issueMessage } from './lead-quality-config.issues';
import { leadQualityConfigSchema, type LeadQualityConfigFormValues } from './lead-quality-config.schema';
import type { LeadQualityConfigFormProps, LeadQualitySubmission } from './lead-quality-config.types';
import BandsFields from './fields/BandsFields';
import CriteriaFields from './fields/CriteriaFields';
import FormActions from './fields/FormActions';
import { LiveIssuesProvider } from './fields/LiveIssues';
import QualificationFields from './fields/QualificationFields';

const NO_ISSUES: NonNullable<LeadQualityConfigFormProps['serverIssues']> = [];

/**
 * CRM › Settings › Lead Quality Score: one lead type's scoring model — the
 * criteria builder, the qualification rule and the classification bands.
 *
 * Save draft checks the draft rules (never over 100%); Publish checks the
 * publish rules (exactly 100%, every criterion's sub-criteria adding up to
 * it). Both are the generated copy of the server's validator, so the form
 * refuses what the API would refuse — and what the API refuses anyway comes
 * back through `serverIssues` onto the same fields.
 */
export default function LeadQualityConfigForm({
  config,
  readOnly = false,
  busy = false,
  serverIssues = NO_ISSUES,
  onSaveDraft,
  onPublish,
}: Readonly<LeadQualityConfigFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => leadQualityConfigSchema(t, 'DRAFT'), [t]);
  const publishSchema = useMemo(() => leadQualityConfigSchema(t, 'PUBLISH'), [t]);
  // The form is keyed per stored version, so what it loaded never changes underneath it.
  const loaded = useMemo(() => valuesFromConfig(config), [config]);
  const loadedInput = useMemo(() => JSON.stringify(toConfigInput(loaded)), [loaded]);
  const methods = useForm<LeadQualityConfigFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: loaded,
    disabled: readOnly,
  });
  const { handleSubmit, setError } = methods;
  const [refused, setRefused] = useState(false);

  useEffect(() => {
    for (const issue of serverIssues) {
      const name = formFieldName(issue.path);
      if (isLeafPath(name)) setError(name, { type: 'server', message: issueMessage(t, issue) });
    }
  }, [serverIssues, setError, t]);
  const listIssues = serverIssues.filter((issue) => !isLeafPath(formFieldName(issue.path)));

  /** Dirty = what would be sent differs from what was loaded (decided at submit time, not from a render-time flag). */
  const submission = (values: LeadQualityConfigFormValues): LeadQualitySubmission => {
    const input = toConfigInput(values);
    const changeNote = values.change_note.trim();
    return { input, change_note: changeNote, dirty: JSON.stringify(input) !== loadedInput || changeNote !== loaded.change_note.trim() };
  };

  const save = handleSubmit((values) => {
    setRefused(false);
    onSaveDraft(submission(values));
  });

  const publish = handleSubmit(
    (values) => {
      const allowed = publishSchema.safeParse(values).success;
      setRefused(!allowed);
      if (allowed) onPublish(submission(values));
    },
    () => setRefused(true),
  );

  return (
    <FormProvider {...methods}>
      <LiveIssuesProvider>
        <Box component="form" noValidate onSubmit={save} data-testid="lead-quality-config-form">
          <Stack spacing={3}>
            {serverIssues.length > 0 && (
              <Alert severity="error" data-testid="lead-quality-server-issues">
                <AlertTitle>{t('crm.leadQualitySettings.serverRefused')}</AlertTitle>
                {listIssues.map((issue) => (
                  <div key={`${issue.path}:${issue.code}`}>{issueMessage(t, issue)}</div>
                ))}
              </Alert>
            )}
            <CriteriaFields />
            <QualificationFields />
            <BandsFields />
            {!readOnly && <FormActions busy={busy} refused={refused} onPublish={publish} />}
          </Stack>
        </Box>
      </LiveIssuesProvider>
    </FormProvider>
  );
}
