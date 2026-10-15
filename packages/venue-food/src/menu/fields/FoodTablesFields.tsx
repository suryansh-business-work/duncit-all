import { useState } from 'react';
import { useController, type FieldValues, type Path } from 'react-hook-form';
import { Stack, TextField, Typography } from '@mui/material';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { foodTablesFromCount } from '@duncit/utils';
import type { FoodControlProps } from './food-paths';
import FoodTableStickersButton from './FoodTableStickersButton';

interface Props<T extends FieldValues, TOut> extends FoodControlProps<T, TOut> {
  /** Tables a venue may list — from the registration config. */
  limit: number;
  venueId?: string;
  venueName?: string;
  /** Whether the venue already has tables saved — the stickers print the saved list. */
  hasSavedTables: boolean;
  idPrefix: string;
}

/**
 * A cafe's tables: typed as a list ("1, 2, Patio") or filled in from a count
 * ("12" → 1 to 12), then printed as one QR sticker each. A guest who scans a
 * sticker has their table filled in at checkout.
 */
export default function FoodTablesFields<T extends FieldValues, TOut = T>({
  control,
  limit,
  venueId,
  venueName,
  hasSavedTables,
  idPrefix,
}: Readonly<Props<T, TOut>>) {
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name: 'food_tables' as Path<T> });
  const [count, setCount] = useState('');
  const countValue = Number(count);
  const canFill = Number.isInteger(countValue) && countValue > 0;

  return (
    <Stack spacing={1.5} data-testid={`${idPrefix}-food-tables`}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
          {t('venueFoodOwner.tables.title')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venueFoodOwner.tables.intro')}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <TextField
          label={t('venueFoodOwner.tables.count')}
          type="number"
          size="small"
          value={count}
          onChange={(event) => setCount(event.target.value)}
          slotProps={{ htmlInput: { min: 1, max: limit, step: 1, inputMode: 'numeric' } }}
          sx={{ maxWidth: 200 }}
          data-testid={`${idPrefix}-food-table-count`}
        />
        <DuncitButton
          size="small"
          startIcon={<FormatListNumberedIcon />}
          disabled={!canFill}
          onClick={() => field.onChange(foodTablesFromCount(countValue, limit))}
          sx={{ mt: 0.5 }}
          data-testid={`${idPrefix}-food-table-fill`}
        >
          {t('venueFoodOwner.tables.fill')}
        </DuncitButton>
      </Stack>
      <TextField
        label={t('venueFoodOwner.tables.label')}
        value={typeof field.value === 'string' ? field.value : ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        inputRef={field.ref}
        name={field.name}
        multiline
        minRows={2}
        size="small"
        fullWidth
        error={!!fieldState.error}
        helperText={fieldState.error?.message ?? t('venueFoodOwner.tables.labelHint')}
        slotProps={{ htmlInput: { 'data-testid': `${idPrefix}-food-tables-input` } }}
      />
      <FoodTableStickersButton venueId={venueId} venueName={venueName} hasSavedTables={hasSavedTables} idPrefix={idPrefix} />
    </Stack>
  );
}
