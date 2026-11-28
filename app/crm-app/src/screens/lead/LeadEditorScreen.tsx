import { useLayoutEffect, useMemo, useState } from 'react';
import {
  StackActions,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';

import { StateView } from '@/components/StateView';
import { LeadForm, type LeadFormValues } from '@/forms/lead';
import { CrmAppLeadEditDocument } from '@/graphql/leadEditor';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { haptics } from '@/services/haptics';
import {
  isLeadKind,
  LEAD_QUERY_FIELD,
  leadQueryFlags,
  type LeadKind,
} from '@/features/leads/leadKinds';
import { saveLead } from '@/features/leads/editor/saveLead';
import { useLeadEditorOptions } from '@/features/leads/editor/useLeadEditorOptions';
import { leadDefaults, leadToForm } from '@/features/leads/editor/values';
import type { AppStackParamList } from '@/navigation/types';
import { errorMessage } from '@/utils/errors';

function LeadEditor({ kind, id }: Readonly<{ kind: LeadKind; id: string | null }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const [error, setError] = useState<string | null>(null);
  const loadFailed = t('crmApp.common.loadFailed');
  const { options, error: optionsError, refetch } = useLeadEditorOptions(kind, loadFailed);
  const variables = useMemo(() => ({ id: id ?? '', ...leadQueryFlags(kind) }), [id, kind]);
  const lead = useGqlQuery(CrmAppLeadEditDocument, variables, {
    fallbackError: loadFailed,
    skip: !id,
  });
  const saved = lead.data?.[LEAD_QUERY_FIELD[kind]] ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: id
        ? t('crmApp.editor.editTitle')
        : t('crmApp.editor.newTitle', { vars: { kind: t(`crmApp.kind.${kind}`) } }),
    });
  }, [id, kind, navigation, t]);

  const initial = useMemo<LeadFormValues | null>(() => {
    if (!id) return leadDefaults(kind);
    return saved ? leadToForm(kind, saved) : null;
  }, [id, kind, saved]);

  const refetchAll = async () => {
    await Promise.all([refetch(), id ? lead.refetch() : Promise.resolve()]);
  };

  if (!options || !initial) {
    // A lead that finished loading but is not there is "not found", whatever the read said.
    const leadMissing = Boolean(id) && !lead.loading && !saved;
    const leadFailure = leadMissing ? (lead.error ?? t('crmApp.lead.notFound')) : null;
    const failure = optionsError ?? leadFailure;
    return (
      <StateView loading={!failure} error={failure} onRetry={failure ? refetchAll : undefined} />
    );
  }

  const submit = async (values: LeadFormValues) => {
    setError(null);
    try {
      const savedId = await saveLead(kind, id, values);
      haptics.success();
      // A new lead opens on its card; an edit returns to the card it came from, which re-reads on focus.
      if (id) navigation.goBack();
      else navigation.dispatch(StackActions.replace('LeadDetail', { kind, id: savedId }));
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    }
  };

  return (
    <LeadForm
      key={id ?? 'new'}
      kind={kind}
      leadId={id}
      initial={initial}
      options={options}
      onSubmit={submit}
      error={error}
      intro={id ? undefined : t('crmApp.editor.newHint')}
    />
  );
}

/** Create a lead of any kind, or edit one — opened from Leads (New lead) or a lead's card (Edit). */
export function LeadEditorScreen() {
  const { t } = useTranslation();
  const { params } = useRoute<RouteProp<AppStackParamList, 'LeadEditor'>>();
  if (!isLeadKind(params.kind)) return <StateView error={t('crmApp.lead.notFound')} />;
  return <LeadEditor kind={params.kind} id={params.id ?? null} />;
}
