import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { MyHostRequestLimitDocument, SetMyVenueRequestLimitDocument } from '@/graphql/pod-requests';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

type HostLimit = NonNullable<ResultOf<typeof MyHostRequestLimitDocument>['myHost']>;

/**
 * Host Settings: how many Pod Requests this host may send to venues each
 * month, and the cap Duncit set when there is one. A save writes the host's
 * own cap and shows what the server kept. mWeb twin: HostSettingsCard.
 */
export function useHostRequestLimit() {
  const { t } = useTranslation();
  const [host, setHost] = useState<HostLimit | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fallback = t('mweb.account.somethingWentWrong');

  const load = useCallback(async () => {
    const res = await graphqlRequest(MyHostRequestLimitDocument, undefined, { auth: true });
    setHost(res.myHost ?? null);
    setLoadError(null);
  }, []);
  const { isLoading } = useReloadableQuery(load, {
    onError: (err) => setLoadError(toErrorMessage(err, fallback)),
  });

  const save = async (limit: number) => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await graphqlRequest(SetMyVenueRequestLimitDocument, { limit }, { auth: true });
      setHost(res.setMyVenueRequestLimit);
      setSaved(true);
    } catch (err) {
      setSaveError(toErrorMessage(err, fallback));
    } finally {
      setSaving(false);
    }
  };

  return { host, isLoading, loadError, saving, saved, saveError, save };
}
