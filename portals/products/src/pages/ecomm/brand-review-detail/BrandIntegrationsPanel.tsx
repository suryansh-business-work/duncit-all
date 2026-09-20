import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import {
  REVIEW_BRAND_INTEGRATION,
  type BrandIntegrationProvider,
  type BrandIntegrations,
  type BrandIntegrationStatus,
} from '../queries';
import BrandIntegrationCard from './BrandIntegrationCard';

interface Props {
  brandId: string;
  integrations: BrandIntegrations;
}

type Checked = Partial<Record<BrandIntegrationProvider, BrandIntegrationStatus>>;

/** One card per provider. "Check now" asks the vendor again and swaps in the
 * answer, so the reviewer sees the live state without reloading the brand. */
export default function BrandIntegrationsPanel({ brandId, integrations }: Readonly<Props>) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState<Checked>({});
  const [checking, setChecking] = useState<BrandIntegrationProvider | null>(null);
  const [recheck] = useMutation<any>(REVIEW_BRAND_INTEGRATION);

  const check = async (provider: BrandIntegrationProvider) => {
    setChecking(provider);
    try {
      const result = await recheck({ variables: { brand_doc_id: brandId, provider } });
      const status: BrandIntegrationStatus = result.data?.reviewBrandIntegration;
      setChecked((prev) => ({ ...prev, [provider]: status }));
    } catch (e) {
      notifyError(parseApiError(e));
    } finally {
      setChecking(null);
    }
  };

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <BrandIntegrationCard
        title={t('products.brandReview.shiprocket')}
        status={checked.SHIPROCKET ?? integrations.shiprocket}
        checking={checking === 'SHIPROCKET'}
        onCheck={() => check('SHIPROCKET')}
      />
      <BrandIntegrationCard
        title={t('products.brandReview.razorpay')}
        status={checked.RAZORPAY ?? integrations.razorpay}
        checking={checking === 'RAZORPAY'}
        onCheck={() => check('RAZORPAY')}
      />
    </Stack>
  );
}
