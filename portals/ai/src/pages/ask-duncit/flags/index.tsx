import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import PageHeader from '../shared/PageHeader';
import { UPDATE_ASK_DUNCIT_CONTROL } from '../shared/mutations';
import { ASK_DUNCIT_SETTINGS } from '../shared/queries';
import { FEATURE_KEYS, type AskDuncitSettings, type FeatureKey } from '../shared/types';
import { useCanControl } from '../shared/useCanControl';

type Translate = ReturnType<typeof useTranslation>['t'];

/** Every key written out once, so the translation gate can see it. */
const featureCopy = (t: Translate): Record<FeatureKey, { label: string; hint: string }> => ({
  voice: { label: t('ai.askDuncit.features.voice'), hint: t('ai.askDuncit.features.voiceHint') },
  uploads: { label: t('ai.askDuncit.features.uploads'), hint: t('ai.askDuncit.features.uploadsHint') },
  memory: { label: t('ai.askDuncit.features.memory'), hint: t('ai.askDuncit.features.memoryHint') },
  proactive_alerts: { label: t('ai.askDuncit.features.alerts'), hint: t('ai.askDuncit.features.alertsHint') },
  knowledge_base: { label: t('ai.askDuncit.features.knowledge'), hint: t('ai.askDuncit.features.knowledgeHint') },
  write_actions: { label: t('ai.askDuncit.features.writes'), hint: t('ai.askDuncit.features.writesHint') },
  evaluation: { label: t('ai.askDuncit.features.evaluation'), hint: t('ai.askDuncit.features.evaluationHint') },
  rollback: { label: t('ai.askDuncit.features.rollback'), hint: t('ai.askDuncit.features.rollbackHint') },
  handover: { label: t('ai.askDuncit.features.handover'), hint: t('ai.askDuncit.features.handoverHint') },
  chat_history: { label: t('ai.askDuncit.features.history'), hint: t('ai.askDuncit.features.historyHint') },
});

/**
 * Ask Duncit › Feature Flags — the assistant's own switches (voice, uploads,
 * memory, write actions …). The menu row itself rides on the platform flag
 * `ask_duncit` in Tech › Feature Flags; both must be on for people to use it.
 */
export default function AskDuncitFlagsPage() {
  const { t } = useTranslation();
  const canControl = useCanControl();
  const { data, loading, error, refetch } = useQuery<{ askDuncitSettings: AskDuncitSettings }>(ASK_DUNCIT_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [update, updating] = useMutation(UPDATE_ASK_DUNCIT_CONTROL);
  const copy = useMemo(() => featureCopy(t), [t]);
  const settings = data?.askDuncitSettings;

  const toggle = (input: Record<string, unknown>) => {
    update({ variables: { input } })
      .then(() => refetch())
      .catch((e: unknown) => notifyError(parseApiError(e) || t('ai.askDuncit.saveFailed')));
  };

  return (
    <Box>
      <PageHeader title={t('ai.askDuncit.flags.title')} subtitle={t('ai.askDuncit.flags.subtitle')} />
      <Alert severity="info" sx={{ mb: 2 }}>
        {t('ai.askDuncit.flags.platformFlag')}
      </Alert>
      {!canControl && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('ai.askDuncit.readOnlyControl')}
        </Alert>
      )}
      <QueryGuard loading={loading && !settings} error={error} errorText={t('ai.askDuncit.loadFailed')} spinnerSx={{ py: 6 }}>
        {() =>
          settings ? (
            <Card>
              <CardContent>
                <Stack spacing={1.5}>
                  <FormControlLabel
                    control={<Switch checked={settings.enabled} disabled={!canControl || updating.loading} onChange={(e) => toggle({ enabled: e.target.checked })} />}
                    label={<Typography sx={{ fontWeight: 700 }}>{t('ai.askDuncit.flags.enabled')}</Typography>}
                  />
                  {FEATURE_KEYS.map((key) => (
                    <FormControlLabel
                      key={key}
                      control={<Switch checked={settings.features[key]} disabled={!canControl || updating.loading} onChange={(e) => toggle({ features: { [key]: e.target.checked } })} />}
                      label={
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {copy[key].label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {copy[key].hint}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ) : null
        }
      </QueryGuard>
    </Box>
  );
}
