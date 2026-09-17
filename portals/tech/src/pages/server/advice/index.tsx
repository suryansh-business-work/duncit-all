import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { SectionCard } from '@duncit/ui';
import { apiHost } from '../queries';
import { GENERATE_SERVER_ADVICE, SERVER_ADVICE, type ServerAdvice } from '../history/queries';
import AdviceBody from './AdviceBody';

/**
 * The AI recommendation on the month of server history. The data goes to
 * OpenAI on request only — opening the page costs nothing — and the newest
 * answer is kept, so everyone on the team reads the same one.
 */
export default function ServerAdviceCard() {
  const { t } = useTranslation();
  const { data, error } = useQuery<{ techServerAdvice: ServerAdvice | null }>(SERVER_ADVICE, {
    fetchPolicy: 'cache-and-network',
  });
  const [generate, { loading }] = useMutation<{ techGenerateServerAdvice: ServerAdvice }>(GENERATE_SERVER_ADVICE, {
    refetchQueries: [{ query: SERVER_ADVICE }],
    awaitRefetchQueries: true,
  });
  const advice = data?.techServerAdvice ?? null;

  const onGenerate = async () => {
    try {
      await generate({ variables: { sslHost: apiHost() } });
      notifySuccess(t('tech.server.adviceReady'));
    } catch (err) {
      notifyError(err instanceof Error ? err.message : String(err));
    }
  };

  const action = (
    <DuncitButton
      variant={advice ? 'outlined' : 'contained'}
      startIcon={<AutoAwesomeIcon />}
      loading={loading}
      onClick={onGenerate}
    >
      {advice ? t('tech.server.adviceRegenerate') : t('tech.server.adviceGenerate')}
    </DuncitButton>
  );

  let body = (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {loading ? t('tech.server.adviceWorking') : t('tech.server.adviceEmpty')}
    </Typography>
  );
  if (advice && !loading) body = <AdviceBody advice={advice} />;

  return (
    <SectionCard title={t('tech.server.adviceTitle')} subtitle={t('tech.server.adviceSubtitle')} action={action}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error.message}</Alert>}
        {body}
      </Stack>
    </SectionCard>
  );
}
