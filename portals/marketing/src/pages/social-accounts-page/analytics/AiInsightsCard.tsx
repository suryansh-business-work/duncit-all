import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { SOCIAL_INSIGHTS, type SocialInsights } from '../queries';
import AiPoints from '../AiPoints';

interface Props {
  /** The Analytics filter, so the AI reads exactly what the charts show. */
  input: { account_ids: string[] | null; days: number };
}

/**
 * The AI's read of the period on screen: what works, what to avoid, when to
 * post and what to do next. Asked for with a button — every answer is a paid
 * call — and not stored, because the numbers under it move with every sync.
 */
export default function AiInsightsCard({ input }: Readonly<Props>) {
  const { t } = useTranslation();
  const [insights, setInsights] = useState<SocialInsights | null>(null);
  const [ask] = useMutation<{ socialInsights: SocialInsights }>(SOCIAL_INSIGHTS);

  const run = async () => {
    try {
      const { data } = await ask({ variables: { input } });
      setInsights(data?.socialInsights ?? null);
    } catch (error) {
      notify(parseApiError(error), 'error');
    }
  };

  const button = (
    <DuncitButton size="small" variant="contained" startIcon={<AutoAwesomeIcon />} onClick={run} data-testid="social-ai-insights">
      {insights ? t('marketing.social.askAgain') : t('marketing.social.getInsights')}
    </DuncitButton>
  );

  return (
    <SectionCard title={t('marketing.social.aiInsightsTitle')} subtitle={t('marketing.social.aiInsightsSubtitle')} action={button}>
      {insights && (
        <Stack spacing={1.5} aria-live="polite" data-testid="social-ai-insights-result">
          <Typography variant="body2">{insights.summary}</Typography>
          <AiPoints title={t('marketing.social.whatWorks')} points={insights.what_works} />
          <AiPoints title={t('marketing.social.whatToAvoid')} points={insights.what_to_avoid} />
          <AiPoints title={t('marketing.social.bestTimes')} points={insights.best_times} />
          <AiPoints title={t('marketing.social.recommendations')} points={insights.recommendations} />
        </Stack>
      )}
    </SectionCard>
  );
}
