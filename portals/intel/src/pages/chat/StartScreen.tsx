import { Box, Chip, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { useBootstrap } from '../../components/IntelBootstrap';
import { ENV_LABEL_KEYS } from '../../components/sources';
import SourceCard from './SourceCard';

/** Suggestion chips — catalogue keys, so the wording is editable in Localization. */
const PROMPT_KEYS = ['intel.start.prompts.podPerformance', 'intel.start.prompts.hostApi', 'intel.start.prompts.hostLeads', 'intel.start.prompts.slackSummary'] as const;

interface Props {
  environment: string;
  onPrompt: (text: string) => void;
}

/** Before the first message: brand, the question, every source's live state and a few suggestions. */
export default function StartScreen({ environment, onPrompt }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading } = useBootstrap();
  return (
    <Stack spacing={3} sx={{ py: { xs: 2, md: 4 }, maxWidth: 1040, mx: 'auto', width: '100%' }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 2 }}>
          {data?.app_title ?? t('intel.brand.title')}
        </Typography>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mt: 0.5, fontSize: { xs: '1.6rem', md: '2.2rem' } }}>
          {t('intel.start.heading')}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {t('intel.start.subheading')}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
          <Chip size="small" label={t('intel.start.environment', { vars: { env: t(ENV_LABEL_KEYS[environment] ?? 'intel.env.STAGING') } })} />
          <Chip size="small" label={t('intel.start.models', { vars: { count: data?.models.length ?? 0 } })} />
        </Stack>
      </Box>

      <Box component="section" aria-labelledby="intel-sources-heading">
        <Typography id="intel-sources-heading" variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
          {t('intel.start.sourcesHeading')}
        </Typography>
        <Grid container spacing={1.5}>
          {loading && !data
            ? Array.from({ length: 8 }, (_, i) => (
                <Grid key={i} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Skeleton variant="rounded" height={96} />
                </Grid>
              ))
            : (data?.sources ?? []).map((card) => (
                <Grid key={card.source} size={{ xs: 6, sm: 4, md: 3 }}>
                  <SourceCard card={card} />
                </Grid>
              ))}
        </Grid>
      </Box>

      <Box component="section" aria-labelledby="intel-prompts-heading">
        <Typography id="intel-prompts-heading" variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {t('intel.start.tryAsking')}
        </Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {PROMPT_KEYS.map((key) => (
            <Chip key={key} variant="outlined" clickable label={t(key)} onClick={() => onPrompt(t(key))} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
