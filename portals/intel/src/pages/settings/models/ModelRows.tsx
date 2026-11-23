import { useFieldArray, useFormState, useWatch, type Control } from 'react-hook-form';
import { Alert, Button, IconButton, Paper, Radio, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from '@duncit/app-settings';
import { RhfSwitch, RhfTextField } from '@duncit/forms';
import type { ModelsOutput, ModelsValues } from './models.types';

/** The model list: id and label, on/off, and exactly one default (the radio). */
export default function ModelRows({ control, setDefault }: Readonly<{ control: Control<ModelsValues, unknown, ModelsOutput>; setDefault: (index: number) => void }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'models' });
  const models = useWatch({ control, name: 'models' });
  const { errors } = useFormState({ control, name: 'models' });
  const listError = errors.models?.root?.message ?? errors.models?.message;
  return (
    <Stack spacing={1}>
      {listError && <Alert severity="error">{listError}</Alert>}
      {fields.map((field, i) => (
        <Paper key={field.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
            <RhfTextField control={control} name={`models.${i}.id`} label={t('intel.settings.models.id')} size="small" />
            <RhfTextField control={control} name={`models.${i}.label`} label={t('intel.settings.models.label')} size="small" />
            <RhfSwitch control={control} name={`models.${i}.enabled`} label={t('intel.settings.models.enabled')} />
            <Tooltip title={t('intel.settings.models.default')}>
              <Radio checked={Boolean(models?.[i]?.is_default)} onChange={() => setDefault(i)} slotProps={{ input: { 'aria-label': t('intel.settings.models.defaultFor', { vars: { model: models?.[i]?.label ?? '' } }) } }} />
            </Tooltip>
            <Tooltip title={t('intel.settings.models.remove')}>
              <span>
                <IconButton aria-label={t('intel.settings.models.remove')} onClick={() => remove(i)} disabled={fields.length <= 1}>
                  <DeleteOutlinedIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Paper>
      ))}
      <div>
        <Button startIcon={<AddIcon />} onClick={() => append({ id: '', label: '', enabled: true, is_default: false })} disabled={fields.length >= 30}>
          {t('intel.settings.models.add')}
        </Button>
      </div>
    </Stack>
  );
}
