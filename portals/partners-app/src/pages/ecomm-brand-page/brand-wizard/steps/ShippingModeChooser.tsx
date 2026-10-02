import { useMutation } from '@apollo/client/react';
import { FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import type { MutationSetBrandShippingModeArgs } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import { SET_BRAND_SHIPPING_MODE, type BrandShippingMode } from '../../queries';

interface Props {
  /** The mode on file; for a brand from before the choice, what it already ships on. */
  mode: BrandShippingMode | null;
  locked: boolean;
  /** The id to mutate against — a new brand is saved first to get one. */
  ensureBrandId: () => Promise<string | null>;
  onChanged: () => void;
}

interface OptionLabelProps {
  title: string;
  hint: string;
}

function OptionLabel({ title, hint }: Readonly<OptionLabelProps>) {
  return (
    <Stack sx={{ py: 0.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {hint}
      </Typography>
    </Stack>
  );
}

/**
 * Who carries the brand's parcels: its own ShipRocket account, or the Duncit
 * courier service. Saved the moment it is picked, like the credential cards —
 * the server re-registers the brand's warehouses on the account it chose.
 */
export default function ShippingModeChooser({ mode, locked, ensureBrandId, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [save, { loading }] = useMutation<
    { setBrandShippingMode: { id: string; shipping_mode: BrandShippingMode | null } },
    MutationSetBrandShippingModeArgs
  >(SET_BRAND_SHIPPING_MODE);

  const choose = async (next: BrandShippingMode) => {
    try {
      const id = await ensureBrandId();
      if (!id) return;
      await save({ variables: { brand_doc_id: id, mode: next } });
      notifySuccess(t('partners.brandWizard.integration.shippingModeSaved'));
      onChanged();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return (
    <SectionCard title={t('partners.brandWizard.integration.shippingTitle')}>
      <RadioGroup
        aria-label={t('partners.brandWizard.integration.shippingTitle')}
        value={mode ?? ''}
        onChange={(_, value) => {
          choose(value as BrandShippingMode).catch(() => undefined);
        }}
      >
        <FormControlLabel
          value="OWN_SHIPROCKET"
          disabled={locked || loading}
          control={<Radio data-testid="brand-shipping-mode-own" />}
          label={
            <OptionLabel
              title={t('partners.brandWizard.integration.shippingModeOwn')}
              hint={t('partners.brandWizard.integration.shippingModeOwnHint')}
            />
          }
        />
        <FormControlLabel
          value="DUNCIT_COURIER"
          disabled={locked || loading}
          control={<Radio data-testid="brand-shipping-mode-duncit" />}
          label={
            <OptionLabel
              title={t('partners.brandWizard.integration.shippingModeDuncit')}
              hint={t('partners.brandWizard.integration.shippingModeDuncitHint')}
            />
          }
        />
      </RadioGroup>
    </SectionCard>
  );
}
