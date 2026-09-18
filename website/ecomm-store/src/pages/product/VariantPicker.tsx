import { useId } from 'react';
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';

import type { StoreProductOption } from '../../graphql/product';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';
import type { Selection, ValueState } from './useVariantSelection';

interface VariantPickerProps {
  options: StoreProductOption[];
  selection: Selection;
  stateOf: (option: string, value: string) => ValueState;
  onChoose: (option: string, value: string) => void;
}

const VALUE_SX = {
  border: 1,
  borderColor: T.border,
  px: 2,
  minHeight: 44,
  bgcolor: T.surface,
  '&.Mui-selected, &.Mui-selected:hover': { bgcolor: T.navBar, color: T.onBrand },
} as const;

/** One pill row per option (size, flavour…); impossible values are disabled, sold-out ones struck. */
export function VariantPicker({ options, selection, stateOf, onChoose }: Readonly<VariantPickerProps>) {
  const { t } = useStoreT();
  const baseId = useId();
  return (
    <Stack spacing={1.5}>
      {options.map((option, index) => {
        const labelId = `${baseId}-option-${index}`;
        return (
          <Stack key={option.name} spacing={0.75}>
            <Typography id={labelId} sx={{ fontWeight: 800 }}>
              {option.name}
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={selection[option.name] ?? null}
              onChange={(_event, value: string | null) => {
                if (value) onChoose(option.name, value);
              }}
              aria-labelledby={labelId}
              sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButtonGroup-grouped': { borderRadius: `${T.radius.pill}px !important`, ml: '0 !important' } }}
            >
              {option.values.map((value) => {
                const state = stateOf(option.name, value);
                const soldOut = state === 'out-of-stock';
                return (
                  <ToggleButton
                    key={value}
                    value={value}
                    disabled={state === 'impossible'}
                    aria-label={soldOut ? t('ecommStore.product.valueSoldOut', { vars: { value } }) : value}
                    sx={{ ...VALUE_SX, textDecoration: soldOut ? 'line-through' : 'none' }}
                  >
                    {value}
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Stack>
        );
      })}
    </Stack>
  );
}
