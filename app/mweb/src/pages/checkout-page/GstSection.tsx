import { useState } from 'react';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { FormControlLabel, Stack, Switch, type SxProps, type Theme } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RhfTextField from '../../forms/components/RhfTextField';
import PodAccordion from '../../components/pod-details/PodAccordion';
import type { CheckoutForm } from './queries';

interface Props {
  control: Control<CheckoutForm>;
  fieldSx: SxProps<Theme>;
}

/**
 * GST details accordion (default collapsed). A switch bound to `has_gstin`
 * reveals the GSTIN input for buyers who need a business invoice; when off the
 * field is hidden and no GSTIN is sent on pay.
 */
export default function GstSection({ control, fieldSx }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const hasGstin = useWatch({ control, name: 'has_gstin' });

  return (
    <PodAccordion
      id="gst-details"
      title="GST details"
      icon={<ReceiptLongIcon fontSize="small" />}
      expanded={open}
      onChange={setOpen}
    >
      <Stack spacing={1.5}>
        <Controller
          control={control}
          name="has_gstin"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={!!field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                />
              }
              label="I have a GSTIN (for business invoice)"
            />
          )}
        />
        {hasGstin && (
          <RhfTextField control={control} name="gstin" label="GSTIN" hint="15-character GSTIN" sx={fieldSx} />
        )}
      </Stack>
    </PodAccordion>
  );
}
