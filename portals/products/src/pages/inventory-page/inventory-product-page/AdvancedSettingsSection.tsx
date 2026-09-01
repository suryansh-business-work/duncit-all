import { useMutation } from '@apollo/client/react';
import { Grid, InputAdornment, MenuItem, Stack, TextField, Tooltip } from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { DuncitButton } from '@duncit/buttons';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import QrPreview from './QrPreview';
import { STATUS_OPTIONS, VISIBILITY_OPTIONS } from './constants';
import { GENERATE_INVENTORY_SKU } from './productQueries';
import type { InventoryProductFormValues } from './types';
import { useTranslation } from '@duncit/shell';

interface AdvancedSettingsSectionProps {
  onError: (msg: string) => void;
}

export default function AdvancedSettingsSection({ onError }: Readonly<AdvancedSettingsSectionProps>) {
  const { t } = useTranslation();
  const { control, setValue } = useFormContext<InventoryProductFormValues>();
  const [generateSku, { loading: generating }] = useMutation<any>(GENERATE_INVENTORY_SKU);
  const sku = useWatch({ control, name: 'sku' });
  const barcode = useWatch({ control, name: 'barcode' });

  const onGenerate = async () => {
    try {
      const res = await generateSku();
      const next = res.data?.generateInventorySku;
      if (next) setValue('sku', next, { shouldDirty: true, shouldValidate: true });
    } catch (err: any) {
      /* v8 ignore next -- Apollo rejects with a message; the string fallback is defensive */
      onError(err?.message ?? 'Could not generate SKU');
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <Controller
          control={control}
          name="sku"
          render={({ field, fieldState }) => (
            <TextField
              fullWidth
              name={field.name}
              inputRef={field.ref}
              label="SKU"
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
              onBlur={field.onBlur}
              error={!!fieldState.error}
              helperText={
                fieldState.error?.message ??
                'Auto-generated 8 chars · uppercase / digits / hyphen'
              }
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title={t('products.advanced.generateSku')}>
                        <DuncitButton size="small" onClick={onGenerate} disabled={generating}>
                          <AutorenewIcon fontSize="small" />
                        </DuncitButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }
              }}
            />
          )}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <RhfTextField
          control={control}
          name="barcode"
          label={t('products.advanced.barcodeValue')}
          hint="Optional · printed/scanned at checkout"
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <RhfTextField
          select
          control={control}
          name="status"
          label={t('shell.common.status')}
          hint="Drafts are hidden from pod creation"
        >
          {STATUS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 6
        }}>
        <RhfTextField
          select
          control={control}
          name="visibility"
          label={t('products.advanced.visibility')}
          hint="Internal products are admin-only"
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid size={12}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{
            alignItems: { sm: 'flex-start' }
          }}
        >
          <QrPreview value={barcode || sku} caption={t('products.advanced.qrForSku')} />
        </Stack>
      </Grid>
    </Grid>
  );
}
