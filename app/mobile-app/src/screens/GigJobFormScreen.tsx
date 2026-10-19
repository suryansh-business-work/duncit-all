import { useMemo, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';
import { makeGigJobSchema } from '@duncit/forms/schemas';
import {
  canPostGigs,
  emptyGigJobValues,
  gigJobToValues,
  parseApiError,
  toGigJobInput,
  type GigCategory,
  type GigJob,
  type GigJobFormValues,
  type GigPosterRole,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { GigContactFields } from '@/components/gigs/gig-form/GigContactFields';
import { GigWhatFields } from '@/components/gigs/gig-form/GigWhatFields';
import { GigWhenWhereFields } from '@/components/gigs/gig-form/GigWhenWhereFields';
import { GigNote } from '@/components/gigs/GigNote';
import { useGigContext } from '@/components/gigs/useGigContext';
import { useGigJob } from '@/components/gigs/useGigJob';
import { StackScreen } from '@/components/StackScreen';
import { GigEventType, GigPosterRole as GqlPosterRole } from '@/generated/graphql/graphql';
import { CreateGigJobDocument, UpdateGigJobDocument } from '@/graphql/gigs';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';

/** The shared input, typed as the generated enums the request expects. */
const requestInput = (values: GigJobFormValues) => {
  const input = toGigJobInput(values);
  return {
    ...input,
    poster_role: input.poster_role as GqlPosterRole,
    event_type: input.event_type as GigEventType,
  };
};

interface FormProps {
  initial: GigJobFormValues;
  categories: readonly GigCategory[];
  posterRoles: readonly GigPosterRole[];
  editId?: string;
}

function GigJobFormBody({ initial, categories, posterRoles, editId }: Readonly<FormProps>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const schema = useMemo(() => makeGigJobSchema(t), [t]);
  const { control, handleSubmit, getValues, setValue } = useForm<GigJobFormValues>({
    defaultValues: initial,
    resolver: zodResolver(schema) as unknown as Resolver<GigJobFormValues>,
    mode: 'onBlur',
  });
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const submit = handleSubmit(async (values) => {
    setBusy(true);
    setApiError(null);
    try {
      const input = requestInput(values);
      const id = editId
        ? (await graphqlRequest(UpdateGigJobDocument, { id: editId, input }, { auth: true }))
            .updateGigJob.id
        : (await graphqlRequest(CreateGigJobDocument, { input }, { auth: true })).createGigJob.id;
      navigation.replace('GigJobDetail', { id });
    } catch (error) {
      setApiError(parseApiError(error, t('gigJobs.form.saveFailed')));
    } finally {
      setBusy(false);
    }
  });

  return (
    <YStack gap={16}>
      <Text fontSize={13.5} color="$muted">
        {t('gigJobs.form.intro')}
      </Text>
      {apiError ? (
        <Text role="alert" fontSize={13} color="$danger" testID="gig-form-error">
          {apiError}
        </Text>
      ) : null}
      <GigWhatFields
        control={control}
        getValues={getValues}
        setValue={setValue}
        categories={categories}
        posterRoles={posterRoles}
      />
      <GigWhenWhereFields control={control} />
      <GigContactFields control={control} />
      <DuncitButton
        label={editId ? t('gigJobs.form.submitEdit') : t('gigJobs.form.submitCreate')}
        loading={busy}
        disabled={busy}
        onPress={() => fireAndForget(submit())}
        testID="gig-form-submit"
      />
    </YStack>
  );
}

/** Post a gig, or edit one of your own (mWeb /gigs/new, /gigs/:id/edit). mWeb twin: GigJobEditor. */
export function GigJobFormScreen() {
  const { t } = useTranslation();
  const id = useRoute<RouteProp<RootStackParamList, 'GigJobForm'>>().params?.id;
  const context = useGigContext();
  const gig = useGigJob(id ?? '', !!id);
  const job: GigJob | null = id ? gig.job : null;
  const waiting = context.loading || (!!id && !job && !gig.failed && !gig.missing);

  let body;
  if (waiting)
    body = <Spinner role="progressbar" aria-label={t('mweb.a11y.loading')} color="$primary" />;
  else if (context.failed || (id && gig.failed))
    body = <GigNote text={t('gigJobs.form.loadFailed')} testID="gig-form-failed" />;
  else if (!canPostGigs(context.viewer) || (id && !job?.is_mine)) {
    body = <GigNote text={t('gigJobs.form.notAllowed')} testID="gig-form-not-allowed" />;
  } else {
    body = (
      <GigJobFormBody
        initial={job ? gigJobToValues(job) : emptyGigJobValues(context.viewer)}
        categories={context.categories}
        posterRoles={context.viewer?.poster_roles ?? []}
        editId={id}
      />
    );
  }

  return (
    <StackScreen
      title={id ? t('gigJobs.form.editTitle') : t('gigJobs.form.createTitle')}
      testID="gig-form-screen"
    >
      <ScrollView
        flex={1}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {body}
      </ScrollView>
    </StackScreen>
  );
}
