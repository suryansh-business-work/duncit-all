import { useMutation } from '@apollo/client/react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { notify } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { ANALYZE_SOCIAL_POST, type SocialPostAnalysis } from '../queries';
import Points from '../AiPoints';

interface Props {
  postId: string;
  analysis: SocialPostAnalysis | null;
}

/** The AI's read of one post, kept on the post; asked for (and re-asked) from here. */
export default function PostAiAnalysis({ postId, analysis }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const [analyze] = useMutation(ANALYZE_SOCIAL_POST);

  const run = async () => {
    try {
      await analyze({ variables: { id: postId } });
    } catch (error) {
      notify(parseApiError(error), 'error');
    }
  };

  const button = (
    <DuncitButton size="small" variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={run} data-testid="social-post-analyse">
      {analysis ? t('marketing.social.reanalyse') : t('marketing.social.analyseWithAi')}
    </DuncitButton>
  );
  const subtitle = analysis?.analyzed_at
    ? t('marketing.social.analysedAt', { vars: { when: formatDateTime(analysis.analyzed_at) } })
    : t('marketing.social.aiAnalysisHint');

  return (
    <SectionCard title={t('marketing.social.aiAnalysis')} subtitle={subtitle} action={button}>
      {analysis && (
        <Stack spacing={1.5} data-testid="social-post-analysis">
          <Box>
            <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>
              {t('marketing.social.aiScoreValue', { vars: { score: analysis.score } })}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={analysis.score}
              aria-label={t('marketing.social.colAiScore')}
              sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('marketing.social.aiScoreHint')}
            </Typography>
          </Box>
          <Typography variant="body2">{analysis.summary}</Typography>
          <Points title={t('marketing.social.strengths')} points={analysis.strengths} />
          <Points title={t('marketing.social.improvements')} points={analysis.improvements} />
          {analysis.next_idea && <Points title={t('marketing.social.nextIdea')} points={[analysis.next_idea]} />}
        </Stack>
      )}
    </SectionCard>
  );
}
