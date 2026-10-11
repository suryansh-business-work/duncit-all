import { useId, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { FormControl, FormControlLabel, FormHelperText, Switch } from '@mui/material';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { SET_BRAND_SHIPROCKET_SANDBOX, type BrandIntegrationStatus, type SetBrandShiprocketSandboxData } from '../queries';

interface Props {
  brandId: string;
  status: BrandIntegrationStatus;
  /** The vendor's answer for the account in its new mode. */
  onChanged: (status: BrandIntegrationStatus) => void;
}

/**
 * Sandbox on/off for a brand's ShipRocket account. Sandbox books test orders
 * only; live books real parcels — either way every order of the brand changes
 * course, so the switch asks before it moves and re-checks the account after.
 */
export default function ShiprocketSandboxControl({ brandId, status, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const hintId = useId();
  const [pending, setPending] = useState<boolean | null>(null);
  const [save, { loading }] = useMutation<SetBrandShiprocketSandboxData>(SET_BRAND_SHIPROCKET_SANDBOX);

  const apply = async () => {
    if (pending === null) return;
    try {
      const result = await save({ variables: { brand_doc_id: brandId, sandbox: pending } });
      const next = result.data?.setBrandShiprocketSandbox;
      if (next) onChanged(next);
      notifySuccess(pending ? t('products.brandReview.sandboxTurnedOn') : t('products.brandReview.sandboxTurnedOff'));
    } catch (error) {
      notifyError(parseApiError(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <FormControl sx={{ mt: 1.5 }}>
      <FormControlLabel
        label={t('products.brandReview.sandboxLabel')}
        control={
          <Switch
            checked={status.sandbox}
            disabled={loading}
            onChange={(_event, checked) => setPending(checked)}
            slotProps={{ input: { 'aria-describedby': hintId } }}
            data-testid="brand-integration-sandbox-switch"
          />
        }
      />
      <FormHelperText id={hintId} sx={{ mx: 0 }}>
        {t('products.brandReview.sandboxHint')}
      </FormHelperText>
      <ConfirmDialog
        open={pending !== null}
        title={pending ? t('products.brandReview.sandboxOnTitle') : t('products.brandReview.sandboxOffTitle')}
        message={pending ? t('products.brandReview.sandboxOnBody') : t('products.brandReview.sandboxOffBody')}
        confirmLabel={pending ? t('products.brandReview.sandboxOnConfirm') : t('products.brandReview.sandboxOffConfirm')}
        confirmColor="warning"
        loading={loading}
        onClose={() => setPending(null)}
        onConfirm={apply}
      />
    </FormControl>
  );
}
