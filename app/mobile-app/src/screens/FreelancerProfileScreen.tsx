import { useCallback, useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';
import { makeFreelancerProfileSchema } from '@duncit/forms/schemas';
import {
  freelancerToValues,
  parseApiError,
  toFreelancerInput,
  type FreelancerFormValues,
  type FreelancerProfile,
  type GigCategory,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { FreelancerFormFields } from '@/components/gigs/FreelancerFormFields';
import { ContactSharingNotice, GigNote } from '@/components/gigs/GigNote';
import { useGigContext } from '@/components/gigs/useGigContext';
import { StackScreen } from '@/components/StackScreen';
import { MyFreelancerProfileDocument, SaveFreelancerProfileDocument } from '@/graphql/gigs';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { useMeStore } from '@/stores/me.store';
import { fireAndForget } from '@/utils/fire-and-forget';

interface FormProps {
  initial: FreelancerFormValues;
  categories: readonly GigCategory[];
  joined: boolean;
}

function FreelancerForm({ initial, categories, joined }: Readonly<FormProps>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const refetchMe = useMeStore((s) => s.refetch);
  const schema = useMemo(() => makeFreelancerProfileSchema(t), [t]);
  const { control, handleSubmit } = useForm<FreelancerFormValues>({
    defaultValues: initial,
    resolver: zodResolver(schema) as unknown as Resolver<FreelancerFormValues>,
    mode: 'onBlur',
  });
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setApiError(null);
    try {
      await graphqlRequest(
        SaveFreelancerProfileDocument,
        { input: toFreelancerInput(values, categories) },
        { auth: true },
      );
      // The FREELANCER role is new on the account: Earn with Duncit reads it from `me`.
      fireAndForget(refetchMe());
      navigation.replace('GigJobs');
    } catch (error) {
      setApiError(parseApiError(error, t('gigJobs.freelancer.saveFailed')));
    } finally {
      setBusy(false);
    }
  });

  return (
    <YStack gap={14}>
      {apiError ? (
        <Text role="alert" fontSize={13} color="$danger">
          {apiError}
        </Text>
      ) : null}
      <FreelancerFormFields control={control} categories={categories} />
      <ContactSharingNotice />
      <DuncitButton
        label={joined ? t('gigJobs.freelancer.save') : t('gigJobs.freelancer.join')}
        loading={busy}
        disabled={busy}
        onPress={() => fireAndForget(submit())}
        testID="freelancer-submit"
      />
    </YStack>
  );
}

/**
 * Earn with Duncit's freelancer step (mWeb /earn/freelancer) — self-serve, no
 * meeting: saving grants the FREELANCER role. mWeb twin: FreelancerProfileEditor.
 */
export function FreelancerProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const context = useGigContext();
  const [profile, setProfile] = useState<FreelancerProfile | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setProfile(
      (await graphqlRequest(MyFreelancerProfileDocument, {}, { auth: true })).myFreelancerProfile ??
        null,
    );
    setFailed(false);
  }, []);
  useReloadableQuery(load, { onError: () => setFailed(true) });

  let body;
  if (failed || context.failed)
    body = <GigNote text={t('gigJobs.freelancer.loadFailed')} testID="freelancer-failed" />;
  else if (profile === undefined || context.loading) {
    body = <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />;
  } else {
    body = (
      <FreelancerForm
        key={profile?.id ?? 'new'}
        initial={freelancerToValues(profile, context.viewer?.default_contact)}
        categories={context.categories}
        joined={!!profile}
      />
    );
  }

  return (
    <StackScreen title={t('gigJobs.freelancer.title')} testID="freelancer-profile-screen">
      <ScrollView
        flex={1}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
      >
        <Text fontSize={13.5} color="$muted">
          {t('gigJobs.freelancer.intro')}
        </Text>
        {profile ? (
          <DuncitButton
            label={t('gigJobs.freelancer.browse')}
            variant="outline"
            onPress={() => navigation.navigate('GigJobs')}
            testID="freelancer-browse"
          />
        ) : null}
        {body}
      </ScrollView>
    </StackScreen>
  );
}
