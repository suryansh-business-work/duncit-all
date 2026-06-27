import { useMutation } from '@apollo/client';
import {
  Button,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import RhfTextField from '../../../forms/components/RhfTextField';
import QrPreview from './QrPreview';
import { STATUS_OPTIONS, VISIBILITY_OPTIONS } from './constants';
import { GENERATE_INVENTORY_SKU } from './productQueries';
import type { InventoryProductFormValues } from './types';

interface AdvancedSettingsSectionProps {
  onError: (msg: string) => void;
}

export default function AdvancedSettingsSection({ onError }: Readonly<AdvancedSettingsSectionProps>) {
  const { control, setValue } = useFormContext<InventoryProductFormValues>();
  const [generateSku, { loading: generating }] = useMutation(GENERATE_INVENTORY_SKU);
  const sku = useWatch({ control, name: 'sku' });
  const barcode = useWatch({ control, name: 'barcode' });

  const onGenerate = async () => {
    try {
      const res = await generateSku();
      const next = res.data?.generateInventorySku;
      if (next) setValue('sku', next, { shouldDirty: true, shouldValidate: true });
    } catch (err: any) {
      onError(err?.message ?? 'Could not generate SKU');
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
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
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Generate new SKU">
                      <Button size="small" onClick={onGenerate} disabled={generating}>
                        <AutorenewIcon fontSize="small" />
                      </Button>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
          )}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <RhfTextField
          control={control}
          name="barcode"
          label="Barcode value"
          hint="Optional · printed/scanned at checkout"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <RhfTextField
          select
          control={control}
          name="status"
          label="Status"
          hint="Drafts are hidden from pod creation"
        >
          {STATUS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <RhfTextField
          select
          control={control}
          name="visibility"
          label="Visibility"
          hint="Internal products are admin-only"
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid item xs={12}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'flex-start' }}
        >
          <QrPreview value={barcode || sku} caption="QR for SKU/barcode" />
        </Stack>
      </Grid>
    </Grid>
  );
}
