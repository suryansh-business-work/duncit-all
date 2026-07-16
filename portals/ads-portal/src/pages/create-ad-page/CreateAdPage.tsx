import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Grid, Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import AdRequestForm, {
  blankAdRequestValues,
  toSubmitAdRequestInput,
  type AdRequestFormValues,
} from './ad-request';
import EstimateCard from './EstimateCard';
import { AD_PRICING, SUBMIT_AD_REQUEST, type AdPricing } from '../ads/queries';

interface SubmitAdRequestResult {
  submitAdRequest: { id: string; trace_id: string };
}

export default function CreateAdPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<AdRequestFormValues>(blankAdRequestValues);
  const [formError, setFormError] = useState<string | null>(null);
  const { data: pricingData, loading: pricingLoading } = useQuery<{ adPricing: AdPricing }>(
    AD_PRICING,
  );
  const [submitAdRequest, { loading: saving }] = useMutation<SubmitAdRequestResult>(
    SUBMIT_AD_REQUEST,
  );

  const handleSubmit = async (values: AdRequestFormValues) => {
    setFormError(null);
    try {
      const result = await submitAdRequest({
        variables: { input: toSubmitAdRequestInput(values) },
      });
      const created = result.data?.submitAdRequest;
      if (!created) throw new Error('Ad request could not be submitted');
      notifySuccess(`Ad request submitted · Trace ID ${created.trace_id}`);
      navigate(`/ads/${created.id}`);
    } catch (error) {
      setFormError(parseApiError(error));
    }
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Create Ad"
        subtitle="Submit an ad request — the Marketing team reviews it and confirms the final cost."
      />
      <Grid container spacing={2} alignItems="flex-start">
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <AdRequestForm
                initialValues={draft}
                busy={saving}
                errorMessage={formError}
                onValuesChange={setDraft}
                onSubmit={handleSubmit}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
            <EstimateCard
              pricing={pricingData?.adPricing}
              loading={pricingLoading}
              position={draft.position}
              durationDays={draft.duration_days}
            />
          </Box>
        </Grid>
      </Grid>
    </Stack>
  );
}
