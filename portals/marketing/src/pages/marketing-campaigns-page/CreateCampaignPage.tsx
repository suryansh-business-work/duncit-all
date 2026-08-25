import { useEffect, useMemo, useState } from 'react';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import CampaignPreview from './CampaignPreview';
import MarketingCampaignForm, {
  blankMarketingCampaignValues,
  isCampaignDraftDirty,
  toMarketingCampaignInput,
  type CampaignAudienceList,
  type MarketingCampaignFormValues,
} from './marketing-campaign-form';
import {
  AUDIENCE_LISTS_FOR_CAMPAIGN,
  CREATE_MARKETING_CAMPAIGN,
  MARKETING_CAMPAIGN_VARIABLES,
  RENDER_MARKETING_CAMPAIGN,
  type CampaignVariable,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

const CAMPAIGNS_PATH = '/campaigns/email';
const PREVIEW_DEBOUNCE_MS = 350;
/** The server needs a subject to render an email; the preview should still
 * follow the MJML while the subject line is still empty. */
const SUBJECT_PLACEHOLDER = '(no subject yet)';

/** The MJML editor and its live preview, side by side — the reason creating a
 * campaign gets a page of its own instead of a dialog. */
export default function CreateCampaignPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<MarketingCampaignFormValues>(() =>
    blankMarketingCampaignValues('EMAIL'),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { data: listsData } = useQuery<{ audienceLists: CampaignAudienceList[] }>(
    AUDIENCE_LISTS_FOR_CAMPAIGN,
    { fetchPolicy: 'cache-and-network' },
  );
  const { data: variablesData } = useQuery<{ marketingCampaignVariables: CampaignVariable[] }>(
    MARKETING_CAMPAIGN_VARIABLES,
  );
  const [renderCampaign, { data: previewData, loading: previewLoading }] = useLazyQuery(
    RENDER_MARKETING_CAMPAIGN,
    { fetchPolicy: 'no-cache' },
  );
  const [createCampaign, { loading: saving }] = useMutation(CREATE_MARKETING_CAMPAIGN);

  // Re-renders on every edit to either field, so the preview tracks the MJML
  // as it is typed rather than waiting for a subject line.
  useEffect(() => {
    if (!draft.mjml.trim()) return;
    const timer = globalThis.setTimeout(() => {
      renderCampaign({
        variables: {
          input: {
            subject: draft.subject.trim() || SUBJECT_PLACEHOLDER,
            mjml: draft.mjml,
          },
        },
      });
    }, PREVIEW_DEBOUNCE_MS);
    return () => globalThis.clearTimeout(timer);
  }, [draft.subject, draft.mjml, renderCampaign]);

  const variables = variablesData?.marketingCampaignVariables ?? [];
  const preview = previewData?.renderMarketingCampaign;

  // What the draft writes that the renderer will not substitute. Reported
  // rather than blocked: an unknown placeholder renders empty, which is a
  // mistake worth naming but not one worth refusing to send over.
  const unknownVariables = useMemo(() => {
    const known = new Set(variables.map((variable) => variable.name));
    const detected: string[] = preview?.detected_variables ?? [];
    return detected.filter((name) => !known.has(name));
  }, [preview, variables]);

  const leave = () => navigate(CAMPAIGNS_PATH);

  // Nothing here is saved until you send or schedule, so leaving with work in
  // the editor throws it away — ask first.
  const handleBack = () => {
    if (isCampaignDraftDirty(draft)) setLeaving(true);
    else leave();
  };

  const handleSubmit = async (values: MarketingCampaignFormValues) => {
    setFormError(null);
    let created;
    try {
      const result = await createCampaign({
        variables: { input: toMarketingCampaignInput(values) },
      });
      created = result.data?.createMarketingCampaign;
    } catch (error) {
      setFormError(parseApiError(error, 'Campaign could not be saved'));
      return;
    }
    // A server-side error means the campaign exists but did not go out — the
    // draft is saved either way, so the list is still where you belong next.
    if (created?.error) notifyError(created.error);
    else notifySuccess(values.scheduled_at ? 'Campaign scheduled' : 'Campaign sent');
    navigate(CAMPAIGNS_PATH);
  };

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Campaigns
        </Button>
        <Stack spacing={0.25}>
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            New campaign
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Write the MJML email, pick who receives it, then send or schedule.
          </Typography>
        </Stack>
      </Stack>

      <Grid container spacing={2} sx={{
        alignItems: "stretch"
      }}>
        <Grid
          size={{
            xs: 12,
            lg: 6
          }}>
          <Card>
            <CardContent>
              <MarketingCampaignForm
                initialValues={draft}
                audienceLists={listsData?.audienceLists ?? []}
                variables={variables}
                unknownVariables={unknownVariables}
                busy={saving}
                previewLoading={previewLoading}
                errorMessage={formError}
                onValuesChange={setDraft}
                onSubmit={handleSubmit}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid
          size={{
            xs: 12,
            lg: 6
          }}>
          <CampaignPreview
            html={preview?.html ?? ''}
            errors={preview?.errors ?? []}
            loading={previewLoading}
            subject={preview?.subject}
          />
        </Grid>
      </Grid>

      {leaving && (
        <ConfirmDialog
          open
          title={t('marketing.marketingCampaigns.leaveWithoutSending')}
          message={t('marketing.marketingCampaigns.thisCampaignHasNotBeenSaved')}
          confirmLabel={t('marketing.marketingCampaigns.discardDraft')}
          confirmColor="error"
          onClose={() => setLeaving(false)}
          onConfirm={leave}
        />
      )}
    </Stack>
  );
}
