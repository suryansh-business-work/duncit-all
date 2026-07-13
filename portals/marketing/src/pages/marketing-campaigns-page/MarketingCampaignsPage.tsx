import { useEffect, useMemo, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { notifyError, notifySuccess } from '../../components/notify';
import CampaignPreview from './CampaignPreview';
import CampaignTable from './CampaignTable';
import MarketingCampaignForm, {
  blankMarketingCampaignValues,
  toMarketingCampaignInput,
  type MarketingCampaignFormValues,
} from './marketing-campaign-form';
import {
  CREATE_MARKETING_CAMPAIGN,
  MARKETING_CAMPAIGNS,
  MARKETING_PREVIEW_CARDS,
  RENDER_MARKETING_CAMPAIGN,
  SEND_MARKETING_CAMPAIGN,
  type CampaignPreviewCard,
  type MarketingCampaignRow,
} from './queries';

interface Props {
  defaultChannel?: 'EMAIL' | 'WHATSAPP';
}

export default function MarketingCampaignsPage({ defaultChannel = 'EMAIL' }: Readonly<Props>) {
  const [draft, setDraft] = useState<MarketingCampaignFormValues>(() => blankMarketingCampaignValues(defaultChannel));
  const [formError, setFormError] = useState<string | null>(null);
  const { data, loading, refetch } = useQuery<{ marketingCampaigns: MarketingCampaignRow[] }>(MARKETING_CAMPAIGNS, { fetchPolicy: 'cache-and-network' });
  const { data: podsData } = useQuery<{ marketingCampaignPreviewCards: CampaignPreviewCard[] }>(MARKETING_PREVIEW_CARDS, { variables: { type: 'POD' } });
  const { data: clubsData } = useQuery<{ marketingCampaignPreviewCards: CampaignPreviewCard[] }>(MARKETING_PREVIEW_CARDS, { variables: { type: 'CLUB' } });
  const [renderCampaign, { data: previewData, loading: previewLoading }] = useLazyQuery(RENDER_MARKETING_CAMPAIGN, { fetchPolicy: 'no-cache' });
  const [createCampaign, { loading: saving }] = useMutation(CREATE_MARKETING_CAMPAIGN);
  const [sendCampaign, { loading: sending }] = useMutation(SEND_MARKETING_CAMPAIGN);

  useEffect(() => {
    setDraft((prev) => ({ ...prev, channel: defaultChannel }));
  }, [defaultChannel]);

  useEffect(() => {
    if (!draft.subject.trim() || !draft.mjml.trim()) return;
    const timer = globalThis.setTimeout(() => {
      renderCampaign({
        variables: {
          input: {
            subject: draft.subject,
            mjml: draft.mjml,
            card_type: draft.card_type || null,
            card_ref_id: draft.card_ref_id || null,
          },
        },
      });
    }, 350);
    return () => globalThis.clearTimeout(timer);
  }, [draft.subject, draft.mjml, draft.card_type, draft.card_ref_id, renderCampaign]);

  const cards = useMemo(() => {
    if (draft.card_type === 'POD') return podsData?.marketingCampaignPreviewCards ?? [];
    if (draft.card_type === 'CLUB') return clubsData?.marketingCampaignPreviewCards ?? [];
    return [];
  }, [clubsData, draft.card_type, podsData]);

  const handleSubmit = async (values: MarketingCampaignFormValues) => {
    setFormError(null);
    try {
      const result = await createCampaign({ variables: { input: toMarketingCampaignInput(values) } });
      const created = result.data?.createMarketingCampaign;
      if (created?.error) notifyError(created.error);
      else notifySuccess(values.scheduled_at ? 'Campaign scheduled' : 'Campaign sent');
      setDraft(blankMarketingCampaignValues(defaultChannel));
      await refetch();
    } catch (error: any) {
      setFormError(error.message || 'Campaign could not be saved');
    }
  };

  const handleSend = async (campaignId: string) => {
    try {
      const result = await sendCampaign({ variables: { campaign_id: campaignId } });
      const sent = result.data?.sendMarketingCampaign;
      if (sent?.error) notifyError(sent.error);
      else notifySuccess('Campaign sent');
      await refetch();
    } catch (error: any) {
      notifyError(error.message || 'Campaign send failed');
    }
  };

  const preview = previewData?.renderMarketingCampaign;

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <CampaignIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>Marketing Campaigns</Typography>
          <Typography variant="caption" color="text.secondary">Create MJML email campaigns with Pod and Club cards.</Typography>
        </Box>
      </Stack>
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <MarketingCampaignForm initialValues={draft} cards={cards} busy={saving} previewLoading={previewLoading} errorMessage={formError} onValuesChange={setDraft} onSubmit={handleSubmit} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={6}>
          <CampaignPreview html={preview?.html ?? ''} errors={preview?.errors ?? []} loading={previewLoading} subject={preview?.subject} />
        </Grid>
      </Grid>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Campaign History</Typography>
          <CampaignTable rows={data?.marketingCampaigns ?? []} loading={loading} sending={sending} onSend={handleSend} />
        </CardContent>
      </Card>
    </Stack>
  );
}