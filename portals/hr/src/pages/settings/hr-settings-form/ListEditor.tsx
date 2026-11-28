import { useFieldArray } from 'react-hook-form';
import { IconButton, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_SETTINGS_LIMITS as L } from '@duncit/utils';
import type { HrSettingsControl } from './hr-settings.types';

interface Props {
  control: HrSettingsControl;
  name: 'departments' | 'work_locations';
  title: string;
}

/** An editable list of names (departments or locations), one text field per entry. */
export default function ListEditor({ control, name, title }: Readonly<Props>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name });
  return (
    <SectionCard title={title} subtitle={t('hrEmployee.settings.listHint')}>
      <Stack spacing={1}>
        {fields.map((field, index) => (
          <Stack key={field.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <RhfTextField
              control={control}
              name={`${name}.${index}.value`}
              label={t('hrEmployee.settings.newItem')}
              size="small"
              fullWidth
              slotProps={{ htmlInput: { maxLength: L.listItemMax, 'data-testid': `hr-settings-${name}-${index}` } }}
            />
            <Tooltip title={t('hrEmployee.settings.removeItem', { vars: { name: field.value || String(index + 1) } })}>
              <IconButton
                onClick={() => remove(index)}
                aria-label={t('hrEmployee.settings.removeItem', { vars: { name: field.value || String(index + 1) } })}
                data-testid={`hr-settings-${name}-remove-${index}`}
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        ))}
        <div>
          <DuncitButton
            startIcon={<AddIcon />}
            onClick={() => append({ value: '' })}
            disabled={fields.length >= L.listMax}
            data-testid={`hr-settings-${name}-add`}
          >
            {t('hrEmployee.settings.addItem')}
          </DuncitButton>
        </div>
      </Stack>
    </SectionCard>
  );
}
