import { Controller, type FieldValues } from 'react-hook-form';
import { FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { offersFoodPath, type FoodControlProps } from './food-paths';

interface Props<T extends FieldValues, TOut> extends FoodControlProps<T, TOut> {
  /** Keeps the ids of two forms on one page apart, and roots the test id. */
  idPrefix: string;
}

/**
 * Whether the venue serves food. Switching it off keeps the menu for later —
 * the server stops taking orders and holds the dishes for when it reopens.
 */
export default function FoodOffersSwitch<T extends FieldValues, TOut = T>({ control, idPrefix }: Readonly<Props<T, TOut>>) {
  const { t } = useTranslation();
  const hintId = `${idPrefix}-offers-food-hint`;

  return (
    <Stack spacing={0}>
      <Controller
        name={offersFoodPath<T>()}
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value === true}
                onChange={(_, checked) => field.onChange(checked)}
                onBlur={field.onBlur}
                slotProps={{ input: { 'aria-describedby': hintId } }}
                data-testid={`${idPrefix}-offers-food`}
              />
            }
            label={t('venueFoodOwner.menu.offersFood')}
          />
        )}
      />
      <FormHelperText id={hintId} sx={{ mt: 0 }}>
        {t('venueFoodOwner.menu.offersFoodHint')}
      </FormHelperText>
    </Stack>
  );
}
