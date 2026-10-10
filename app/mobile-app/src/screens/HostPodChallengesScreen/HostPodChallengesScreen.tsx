import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { FormTextField } from '@/components/FormTextField';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { MediumToggle } from '@/components/attendance/AttendanceOtpControls';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { HostChallengeCard } from '@/components/challenge/host/HostChallengeCard';
import { makeCreateChallengeSchema, type CreateChallengeValues } from '@/forms/challenge';
import { CreatePodChallengeDocument, PodChallengeSetupDocument } from '@/graphql/challenges';
import { usePodChallenges } from '@/hooks/usePodChallenges';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { formResolver } from '@/utils/form-resolver';

interface Setup {
  enabled: boolean;
  require_challenge: boolean;
  default_template_id?: string | null;
  templates: { id: string; name: string }[];
}

/**
 * Host Studio > Your Pods > actions > Challenges — the Tamagui twin of mWeb's
 * /host/pod/:podId/challenges (rule 27). The templates offered are only the
 * ones this pod's category allows (decided by the server); a pod can run
 * several challenges.
 */
export function HostPodChallengesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'HostPodChallenges'>>();
  const podId = params?.podId ?? '';
  const list = usePodChallenges(podId);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const loadSetup = useCallback(async () => {
    const res = await graphqlRequest(PodChallengeSetupDocument, { podId }, { auth: true });
    setSetup(res.podChallengeSetup);
  }, [podId]);
  const setupQuery = useReloadableQuery(loadSetup, {
    enabled: Boolean(podId),
    onError: (e) => setError((e as Error)?.message ?? ''),
  });

  const { control, handleSubmit, reset } = useForm<
    CreateChallengeValues,
    unknown,
    CreateChallengeValues
  >({
    resolver: formResolver<CreateChallengeValues>(makeCreateChallengeSchema(t)),
    defaultValues: { template_id: '', name: '' },
  });
  const create = handleSubmit(async (values) => {
    setCreating(true);
    try {
      await graphqlRequest(
        CreatePodChallengeDocument,
        {
          input: {
            pod_id: podId,
            template_id: values.template_id,
            name: values.name.trim() || null,
          },
        },
        { auth: true },
      );
      reset({ template_id: values.template_id, name: '' });
      setError('');
      await list.refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  });
  const openArena = (pod: string, challengeId: string) =>
    navigation.navigate('ChallengeArena', { podId: pod, challengeId });

  return (
    <StackScreen title={t('mweb.challenge.hostTitle')} testID="host-pod-challenges-screen">
      <RefreshScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <YStack gap={16}>
          {setupQuery.isLoading ? <LoadingIndicator /> : null}
          {error ? <NoticeCard tone="danger" title={error} /> : null}
          {setup && !setup.enabled ? (
            <NoticeCard tone="info" title={t('mweb.challenge.notEnabled')} />
          ) : null}
          {setup?.enabled && setup.templates.length === 0 ? (
            <NoticeCard tone="info" title={t('mweb.challenge.noTemplates')} />
          ) : null}
          {setup?.enabled && setup.templates.length > 0 ? (
            <YStack gap={10}>
              <Text fontSize={16} fontWeight="700" color="$color" role="heading">
                {t('mweb.challenge.newChallenge')}
              </Text>
              <Controller
                control={control}
                name="template_id"
                render={({ field, fieldState }) => (
                  <YStack gap={6}>
                    <XStack
                      gap={6}
                      flexWrap="wrap"
                      role="radiogroup"
                      aria-label={t('mweb.challenge.fields.template')}
                    >
                      {setup.templates.map((tpl) => (
                        <MediumToggle
                          key={tpl.id}
                          label={tpl.name}
                          selected={field.value === tpl.id}
                          onPress={() => field.onChange(tpl.id)}
                        />
                      ))}
                    </XStack>
                    {fieldState.error?.message ? (
                      <Text fontSize={12} color="$danger" role="alert">
                        {fieldState.error.message}
                      </Text>
                    ) : null}
                  </YStack>
                )}
              />
              <FormTextField
                control={control}
                name="name"
                label={t('mweb.challenge.fields.challengeName')}
                hint={t('mweb.challenge.nameHint')}
                maxLength={80}
              />
              <DuncitButton
                label={t('mweb.challenge.addChallenge')}
                loading={creating}
                disabled={creating}
                onPress={() => {
                  create().catch(() => undefined);
                }}
                testID="host-challenge-add"
              />
              {setup.require_challenge && list.challenges.length === 0 ? (
                <NoticeCard tone="warning" title={t('mweb.challenge.required')} />
              ) : null}
            </YStack>
          ) : null}
          {list.challenges.map((c) => (
            <HostChallengeCard key={c.id} challengeId={c.id} onOpenArena={openArena} />
          ))}
          {setup && !list.isLoading && list.challenges.length === 0 ? (
            <Text fontSize={14} color="$muted">
              {t('mweb.challenge.noChallengesYet')}
            </Text>
          ) : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
