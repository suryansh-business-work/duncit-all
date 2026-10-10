import { useParams } from 'react-router';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';
import PageBackHeader from '../pod-pending-page/PageBackHeader';
import { notifyError, notifySuccess } from '../../components/notify';
import { POD_CHALLENGES } from '../../components/pod-challenge/queries';
import { CreateChallengeForm, type CreateChallengeValues } from './create-challenge-form';
import HostChallengePanel from './HostChallengePanel';
import { CREATE_POD_CHALLENGE, POD_CHALLENGE_SETUP } from './queries';

/**
 * Host Studio > Your Pods > ⋮ > Challenges. The templates offered are only
 * the ones this pod's category allows (decided by the server from the
 * category mapping); a pod can run several challenges.
 */
export default function HostPodChallengesPage() {
  const { t } = useTranslation();
  const { podId = '' } = useParams();
  const setup = useQuery(POD_CHALLENGE_SETUP, { variables: { podId }, skip: !podId });
  const list = useQuery(POD_CHALLENGES, { variables: { podId }, fetchPolicy: 'cache-and-network', skip: !podId });
  const [create, createState] = useMutation(CREATE_POD_CHALLENGE, { refetchQueries: [{ query: POD_CHALLENGES, variables: { podId } }] });

  const add = async (v: CreateChallengeValues): Promise<boolean> => {
    try {
      await create({ variables: { input: { pod_id: podId, template_id: v.template_id, name: v.name.trim() || null } } });
      notifySuccess(t('mweb.challenge.created'));
      return true;
    } catch (error) {
      notifyError((error as Error).message);
      return false;
    }
  };
  const config = setup.data?.podChallengeSetup;
  const challenges = list.data?.podChallenges ?? [];

  return (
    <Stack spacing={2.5} sx={{ p: 2, pb: 4 }} data-testid="host-pod-challenges-page">
      <PageBackHeader title={t('mweb.challenge.hostTitle')} backLabel={t('mweb.challenge.back')} />
      {(setup.loading || list.loading) && !config && <CircularProgress aria-label={t('mweb.challenge.loading')} />}
      {setup.error && <Alert severity="error">{setup.error.message}</Alert>}
      {config && !config.enabled && <Alert severity="info">{t('mweb.challenge.notEnabled')}</Alert>}
      {config?.enabled && config.templates.length === 0 && <Alert severity="info">{t('mweb.challenge.noTemplates')}</Alert>}
      {config?.enabled && config.templates.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {t('mweb.challenge.newChallenge')}
          </Typography>
          <CreateChallengeForm templates={config.templates} defaultTemplateId={config.default_template_id ?? null} saving={createState.loading} onSubmit={add} />
          {config.require_challenge && challenges.length === 0 && <Alert severity="warning">{t('mweb.challenge.required')}</Alert>}
        </Stack>
      )}
      {challenges.map((c) => (
        <HostChallengePanel key={c.id} challengeId={c.id} />
      ))}
      {config && challenges.length === 0 && !list.loading && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.challenge.noChallengesYet')}
        </Typography>
      )}
    </Stack>
  );
}
