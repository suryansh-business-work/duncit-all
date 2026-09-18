import type { DefaultValues, FieldValues } from 'react-hook-form';
import { Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import type { SettingsTabSpec, StoreSettings } from './settings.types';

interface SettingsTabFormProps<V extends FieldValues> {
  spec: SettingsTabSpec<V>;
  settings: StoreSettings;
  saving: boolean;
  /** Answers whether the save went through. */
  onSave: (input: Record<string, unknown>) => Promise<boolean>;
}

/**
 * One settings tab as its own form: it validates and saves only the fields it
 * shows, so saving the Checkout tab never touches a half-edited General tab.
 */
export default function SettingsTabForm<V extends FieldValues>({ spec, settings, saving, onSave }: Readonly<SettingsTabFormProps<V>>) {
  const { t, form } = useSchemaForm<V>(spec.makeSchema, spec.toValues(settings) as DefaultValues<V>);
  const { control, handleSubmit, reset, formState } = form;
  const { Fields } = spec;
  const submit = handleSubmit(async (values) => {
    if (await onSave(spec.toInput(values))) reset(values);
  });
  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={2}>
        <Fields control={control} />
        <DuncitButton
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
          loading={saving}
          disabled={!formState.isDirty}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('shell.common.save')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
