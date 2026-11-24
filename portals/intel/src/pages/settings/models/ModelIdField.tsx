import { useController, type Control } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { ModelsOutput, ModelsValues } from './models.types';

interface Props {
  control: Control<ModelsValues, unknown, ModelsOutput>;
  index: number;
  /** The OpenAI account's chat models (empty while loading or when they could not be listed). */
  options: readonly string[];
  loading: boolean;
}

/**
 * A model id picked from the OpenAI account's own models — or typed, for a
 * model the list does not show. Picking one fills an empty label with the id.
 */
export default function ModelIdField({ control, index, options, loading }: Readonly<Props>) {
  const { t } = useTranslation();
  const id = useController({ control, name: `models.${index}.id` });
  const label = useController({ control, name: `models.${index}.label` });
  const value = String(id.field.value ?? '');
  const pick = (next: string) => {
    id.field.onChange(next);
    if (!String(label.field.value ?? '').trim()) label.field.onChange(next);
  };
  return (
    <Autocomplete
      freeSolo
      fullWidth
      size="small"
      loading={loading}
      options={options}
      value={value}
      inputValue={value}
      onInputChange={(_, next, reason) => {
        if (reason !== 'reset') id.field.onChange(next);
      }}
      onChange={(_, next) => pick(typeof next === 'string' ? next : '')}
      onBlur={id.field.onBlur}
      renderInput={(params) => (
        <TextField {...params} inputRef={id.field.ref} label={t('intel.settings.models.id')} error={Boolean(id.fieldState.error)} helperText={id.fieldState.error?.message ?? t('intel.settings.models.idHint')} />
      )}
    />
  );
}
