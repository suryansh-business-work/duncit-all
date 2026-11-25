import { useMemo, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { crmOtherMediaKind, type CrmLeadMediaKind } from '@duncit/utils';

import {
  CrmAppAddLeadMediaDocument,
  CrmAppDeleteLeadMediaDocument,
  CrmAppLeadMediaDocument,
  CrmAppUpdateLeadMediaDocument,
} from '@/graphql/leadTabsB';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import { pickImages, uploadImages, type UploadedImage } from './MediaUpload';

export type LeadMediaItem = ResultOf<typeof CrmAppLeadMediaDocument>['crmLeadMedia'][number];

/**
 * A lead's logos and images, and every change to them — the portal's
 * useLeadMedia. Pictures upload first; only the ones that uploaded are
 * attached, and each change re-reads the list so the tab never shows an item
 * the server did not keep.
 */
export function useLeadMedia(kind: LeadKind, id: string) {
  const { t } = useTranslation();
  const variables = useMemo(() => ({ entity_type: kind, lead_id: id }), [kind, id]);
  const query = useGqlQuery(CrmAppLeadMediaDocument, variables, {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const folder = `crm/leads/${kind.toLowerCase()}`;

  const run = async (work: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setActionError(null);
    try {
      await work();
      await query.refetch();
      return true;
    } catch (err) {
      setActionError(errorMessage(err, t('crmApp.common.saveFailed')));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const upload = async (multiple: boolean): Promise<UploadedImage[]> => {
    setActionError(null);
    setBusy(true);
    try {
      const assets = await pickImages(multiple);
      const { uploaded, errors } = await uploadImages(assets, folder, t);
      setUploadErrors(errors);
      return uploaded;
    } catch (err) {
      setActionError(errorMessage(err, t('crmApp.common.saveFailed')));
      return [];
    } finally {
      setBusy(false);
    }
  };

  const add = async (mediaKind: CrmLeadMediaKind) => {
    const files = await upload(true);
    if (files.length === 0) return;
    await run(() =>
      gqlRequest(CrmAppAddLeadMediaDocument, {
        ...variables,
        items: files.map((file) => ({ kind: mediaKind, ...file })),
      }),
    );
  };

  const replace = async (item: LeadMediaItem) => {
    const [file] = await upload(false);
    if (!file) return;
    const input = {
      url: file.url,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      width: file.width,
      height: file.height,
    };
    await run(() => gqlRequest(CrmAppUpdateLeadMediaDocument, { id: item.id, input }));
  };

  return {
    items: query.data?.crmLeadMedia ?? [],
    loading: query.loading && !query.data,
    loadError: query.data ? null : query.error,
    refetch: query.refetch,
    busy,
    actionError,
    clearActionError: () => setActionError(null),
    uploadErrors,
    clearUploadErrors: () => setUploadErrors([]),
    add,
    replace,
    rename: (item: LeadMediaItem, name: string) =>
      run(() => gqlRequest(CrmAppUpdateLeadMediaDocument, { id: item.id, input: { name } })),
    move: (item: LeadMediaItem) =>
      run(() =>
        gqlRequest(CrmAppUpdateLeadMediaDocument, {
          id: item.id,
          input: { kind: crmOtherMediaKind(item.kind) },
        }),
      ),
    remove: (item: LeadMediaItem) =>
      run(() => gqlRequest(CrmAppDeleteLeadMediaDocument, { id: item.id })),
  };
}
