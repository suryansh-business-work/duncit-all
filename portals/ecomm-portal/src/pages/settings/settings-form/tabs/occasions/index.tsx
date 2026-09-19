import { useFieldArray, type Control } from 'react-hook-form';
import { Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { SettingsTabSpec, StoreSettings } from '../../settings.types';
import OccasionRow from './OccasionRow';
import {
  blankOccasion,
  makeOccasionsSchema,
  MAX_OCCASIONS,
  toOccasionInput,
  toOccasionValues,
  type OccasionsValues,
} from './occasion.rules';

const toValues = (s: StoreSettings): OccasionsValues => ({ occasions: s.occasions.map(toOccasionValues) });

const toInput = (v: OccasionsValues) => ({ occasions: v.occasions.map(toOccasionInput) });

function OccasionFields({ control }: Readonly<{ control: Control<OccasionsValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'occasions' });
  return (
    <Stack spacing={1.5} data-testid="settings-occasions">
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ecommPortal.settings.occasionsHint')}
      </Typography>
      {fields.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="settings-no-occasions">
          {t('ecommPortal.settings.noOccasions')}
        </Typography>
      )}
      {fields.map((field, index) => (
        <OccasionRow
          key={field.id}
          control={control}
          index={index}
          isFirst={index === 0}
          isLast={index === fields.length - 1}
          onMoveUp={() => move(index, index - 1)}
          onMoveDown={() => move(index, index + 1)}
          onRemove={() => remove(index)}
        />
      ))}
      <DuncitButton
        startIcon={<AddIcon />}
        onClick={() => append(blankOccasion())}
        disabled={fields.length >= MAX_OCCASIONS}
        sx={{ alignSelf: 'flex-start' }}
        data-testid="settings-add-occasion"
      >
        {t('ecommPortal.settings.addOccasion')}
      </DuncitButton>
    </Stack>
  );
}

/** Festive windows: while one is open the store swaps its logo, favicon and background. */
export const OCCASIONS_TAB: SettingsTabSpec<OccasionsValues> = {
  makeSchema: makeOccasionsSchema,
  toValues,
  toInput,
  Fields: OccasionFields,
};
