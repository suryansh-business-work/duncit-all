import { useEffect, useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Box, Dialog, DialogContent, DialogTitle, Grid } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import {
  AdRequestForm,
  EstimateCard,
  blankAdRequestValues,
  toSubmitAdRequestInput,
  type AdPricing,
  type AdRequestFormValues,
} from '@duncit/ad-request-form';
import type { ProductListingRow } from './queries';

export type AdKind = 'PRODUCT_AD' | 'BRAND_AD';

const AD_PRICING = gql`
  query PartnerAdPricing {
    adPricing {
      auto_per_day
      home_bottom_per_day
      sidebar_per_day
      explore_scroll_per_day
      status_per_day
      venue_list_per_day
      club_list_per_day
      pod_list_per_day
      pod_details_per_day
      currency_symbol
    }
  }
`;

const SUBMIT_AD_REQUEST = gql`
  mutation PartnerSubmitAdRequest($input: SubmitAdRequestInput!) {
    submitAdRequest(input: $input) {
      id
      trace_id
    }
  }
`;

interface Props {
  product: ProductListingRow | null;
  adKind: AdKind;
  open: boolean;
  onClose: () => void;
  onSubmitted: (traceId: string) => void;
}

/** "Run ad" dialog: the shared ad-request form + live estimate, prefilled from
 * the brand's product. Submits a PRODUCT_AD / BRAND_AD to Marketing's queue. */
export default function RunAdDialog({ product, adKind, open, onClose, onSubmitted }: Readonly<Props>) {
  const { data: pricingData, loading: pricingLoading } = useQuery<{ adPricing: AdPricing }>(AD_PRICING, { skip: !open });
  const [submitAd, { loading: saving }] = useMutation(SUBMIT_AD_REQUEST);
  const [error, setError] = useState<string | null>(null);

  const initialValues = useMemo<AdRequestFormValues>(() => {
    const base = blankAdRequestValues();
    if (!product) return base;
    const image = product.image_url || product.images?.[0] || '';
    const name = String(product.product_name ?? '');
    return {
      ...base,
      ad_title: adKind === 'BRAND_AD' ? `Discover ${name}` : name,
      ad_description: String(product.description ?? '').slice(0, 1000),
      media_url: image,
    };
  }, [product, adKind]);

  const [draft, setDraft] = useState<AdRequestFormValues>(initialValues);
  useEffect(() => setDraft(initialValues), [initialValues]);

  const title = adKind === 'BRAND_AD' ? 'Run a Brand Ad' : 'Run a Product Ad';

  const handleSubmit = async (values: AdRequestFormValues) => {
    if (!product) return;
    setError(null);
    try {
      const result = await submitAd({
        variables: { input: { ...toSubmitAdRequestInput(values), ad_kind: adKind, product_id: product.id } },
      });
      onSubmitted(result.data?.submitAdRequest?.trace_id ?? '');
    } catch (submitError) {
      setError(parseApiError(submitError));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} md={8}>
            <AdRequestForm
              key={`${product?.id ?? 'none'}-${adKind}`}
              initialValues={initialValues}
              busy={saving}
              errorMessage={error}
              onValuesChange={setDraft}
              onSubmit={handleSubmit}
              submitLabel={title}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 8 } }}>
              <EstimateCard
                pricing={pricingData?.adPricing}
                loading={pricingLoading}
                position={draft.position}
                durationDays={draft.duration_days}
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
