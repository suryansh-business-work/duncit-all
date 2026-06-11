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
import { useFormikContext } from 'formik';
import QrPreview from './QrPreview';
import { STATUS_OPTIONS, VISIBILITY_OPTIONS } from './constants';
import { GENERATE_INVENTORY_SKU } from './productQueries';
import type { InventoryProductFormValues } from './types';

interface AdvancedSettingsSectionProps {
  onError: (msg: string) => void;
}

export default function AdvancedSettingsSection({ onError }: Readonly<AdvancedSettingsSectionProps>) {
  const f = useFormikContext<InventoryProductFormValues>();
  const [generateSku, { loading: generating }] = useMutation(GENERATE_INVENTORY_SKU);

  const onGenerate = async () => {
    try {
      const res = await generateSku();
      const next = res.data?.generateInventorySku;
      if (next) f.setFieldValue('sku', next);
    } catch (err: any) {
      onError(err?.message ?? 'Could not generate SKU');
    }
  };

  const showError = (k: keyof InventoryProductFormValues) =>
    !!(f.touched[k] && f.errors[k]);
  const helper = (k: keyof InventoryProductFormValues, fb: string) =>
    (f.touched[k] && (f.errors[k] as string)) || fb;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          name="sku"
          label="SKU"
          value={f.values.sku}
          onChange={(e) => f.setFieldValue('sku', e.target.value.toUpperCase())}
          onBlur={f.handleBlur}
          error={showError('sku')}
          helperText={helper('sku', 'Auto-generated 8 chars · uppercase / digits / hyphen')}
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
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          name="barcode"
          label="Barcode value"
          value={f.values.barcode}
          onChange={f.handleChange}
          helperText="Optional · printed/scanned at checkout"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          name="status"
          label="Status"
          value={f.values.status}
          onChange={f.handleChange}
          helperText="Drafts are hidden from pod creation"
        >
          {STATUS_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          name="visibility"
          label="Visibility"
          value={f.values.visibility}
          onChange={f.handleChange}
          helperText="Internal products are admin-only"
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'flex-start' }}
        >
          <QrPreview value={f.values.barcode || f.values.sku} caption="QR for SKU/barcode" />
        </Stack>
      </Grid>
    </Grid>
  );
}
