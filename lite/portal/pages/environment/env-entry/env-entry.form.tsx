import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, Typography } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { usePortalT } from '../../../../shared/i18n';
import { ExternalLink } from '../../../components/ExternalLink';
import { FormDialog } from '../../../components/FormDialog';
import { RhfSwitch } from '../../../components/RhfSwitch';
import type { LiteEnvCategoryDef, LiteEnvEntry } from '../../../graphql/environment';
import { ConfigField } from './ConfigField';
import { emptyEnvValues, envValuesFrom, makeEnvEntrySchema, secretPresent, type EnvEntryFormValues } from './env-entry.types';

interface Props {
  open: boolean;
  def: LiteEnvCategoryDef;
  initial: LiteEnvEntry | null;
  busy: boolean;
  testing: boolean;
  onClose: () => void;
  onSubmit: (values: EnvEntryFormValues) => Promise<void>;
  onTest: (entry: LiteEnvEntry) => void;
}

/** The dynamic form: the category's field list from the server decides what is asked. */
export function EnvEntryForm({ open, def, initial, busy, testing, onClose, onSubmit, onTest }: Readonly<Props>) {
  const { t } = usePortalT();
  const schema = useMemo(() => makeEnvEntrySchema(t, def, initial), [t, def, initial]);
  const { control, handleSubmit, reset } = useForm<EnvEntryFormValues, unknown, EnvEntryFormValues>({
    defaultValues: emptyEnvValues(),
    resolver: zodResolver(schema) as Resolver<EnvEntryFormValues, unknown, EnvEntryFormValues>,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (open) reset(initial ? envValuesFrom(initial) : emptyEnvValues());
  }, [open, initial, reset]);

  const title = initial ? t('litePortal.environment.editTitle', { vars: { name: initial.name } }) : t('litePortal.environment.newTitle', { vars: { label: def.label } });
  const testButton = initial ? (
    <DuncitButton startIcon={<ScienceIcon />} onClick={() => onTest(initial)} disabled={testing || busy} data-testid="env-dialog-test">
      {testing ? t('litePortal.common.testing') : t('litePortal.common.test')}
    </DuncitButton>
  ) : null;

  return (
    <FormDialog open={open} title={title} onSubmit={handleSubmit(onSubmit)} onClose={onClose} busy={busy} secondaryAction={testButton} testId="env-entry-dialog">
      <Stack spacing={1.5}>
        {def.docUrl && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <ExternalLink href={def.docUrl} label={t('litePortal.environment.docLink', { vars: { label: def.label } })} testId="env-dialog-doc-link" />
          </Typography>
        )}
        <RhfTextField
          control={control}
          name="name"
          label={t('litePortal.common.name')}
          hint={t('litePortal.environment.nameHint')}
          required
          disabled={busy}
          autoComplete="off"
          slotProps={{ htmlInput: { 'data-testid': 'env-name', 'data-1p-ignore': true, 'data-lpignore': true } }}
        />
        <RhfTextField control={control} name="description" label={t('litePortal.common.description')} multiline minRows={2} disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'env-description' } }} />
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
          <RhfSwitch control={control} name="is_default" label={t('litePortal.environment.default')} hint={t('litePortal.environment.isDefaultHint')} disabled={busy} testId="env-default" />
          <RhfSwitch control={control} name="is_active" label={t('litePortal.common.active')} disabled={busy} testId="env-active" />
        </Stack>
        <Typography variant="overline" component="h2" sx={{ color: 'text.secondary', pt: 1 }}>
          {t('litePortal.environment.config', { vars: { label: def.label } })}
        </Typography>
        {def.fields.map((field) => (
          <ConfigField key={field.name} control={control} field={field} secretKept={secretPresent(initial, field)} disabled={busy} />
        ))}
      </Stack>
    </FormDialog>
  );
}
