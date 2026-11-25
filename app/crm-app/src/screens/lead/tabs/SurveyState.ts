import { useMemo, useState } from 'react';
import { Share } from 'react-native';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { crmSurveyLinkUrl, type CrmSurveyAnswerInput } from '@duncit/utils';

import { config } from '@/constants/config';
import {
  CrmAppDeleteSurveyEntryDocument,
  CrmAppGenerateSurveyLinkDocument,
  CrmAppLeadSurveyDocument,
  CrmAppRevokeSurveyLinkDocument,
  CrmAppSaveLeadSurveyDocument,
} from '@/graphql/leadTabsB';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { gqlRequest } from '@/services/graphql.client';
import { errorMessage } from '@/utils/errors';
import type { SurveyKind } from './TabsBTypes';

type Result = ResultOf<typeof CrmAppLeadSurveyDocument>['leadSurvey'];
export type LeadSurveyDef = NonNullable<Result['survey']>;
export type LeadSurveyEntry = Result['entries'][number];

/** The public fill page for a share token, on the CRM portal's host (the same link the portal copies). */
export const surveyLinkUrl = (token: string) => crmSurveyLinkUrl(config.portalUrl, token);

/** Open the phone's share sheet with a survey's public link (copy is one of its choices). */
export const shareSurveyLink = (token: string) => Share.share({ message: surveyLinkUrl(token) });

/**
 * One lead's survey: the survey matched to its category (or the one picked
 * when it has several), every generation / response logged against it, and
 * the actions the portal's Survey tab offers.
 */
export function useLeadSurvey(kind: SurveyKind, id: string) {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const variables = useMemo(
    () => ({
      entity: kind,
      lead_id: id,
      category_id: categoryId || null,
      sub_category_id: subCategoryId || null,
    }),
    [kind, id, categoryId, subCategoryId],
  );
  const query = useGqlQuery(CrmAppLeadSurveyDocument, variables, {
    fallbackError: t('crmApp.common.loadFailed'),
  });
  const data = query.data?.leadSurvey;

  /** Runs one change, then re-reads the log; resolves false (with the reason shown) when it failed. */
  const run = async (work: () => Promise<unknown>): Promise<boolean> => {
    setError(null);
    setBusy(true);
    try {
      await work();
      await query.refetch();
      return true;
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const survey = data?.survey ?? null;
  return {
    survey,
    entries: data?.entries ?? [],
    categories: data?.categories ?? [],
    subCategories: data?.sub_categories ?? [],
    categoryId,
    subCategoryId,
    pickCategory: (next: string) => {
      setCategoryId(next);
      setSubCategoryId('');
    },
    pickSubCategory: setSubCategoryId,
    loading: query.loading && !query.data,
    loadError: query.data ? null : query.error,
    refetch: query.refetch,
    busy,
    error,
    clearError: () => setError(null),
    save: (answers: CrmSurveyAnswerInput[]) =>
      run(() =>
        gqlRequest(CrmAppSaveLeadSurveyDocument, {
          entity: kind,
          lead_id: id,
          survey_id: survey?.id ?? '',
          answers,
        }),
      ),
    /** Generate a share link (logged as a LINK entry), then offer it straight away. */
    generateLink: async () => {
      const link = { token: '' };
      const ok = await run(async () => {
        const res = await gqlRequest(CrmAppGenerateSurveyLinkDocument, {
          entity: kind,
          lead_id: id,
          survey_id: survey?.id ?? '',
        });
        link.token = res.generateLeadSurveyLink.token ?? '';
      });
      if (ok && link.token) await shareSurveyLink(link.token);
    },
    revoke: (entryId: string) =>
      run(() => gqlRequest(CrmAppRevokeSurveyLinkDocument, { entry_id: entryId })),
    remove: (entryId: string) =>
      run(() => gqlRequest(CrmAppDeleteSurveyEntryDocument, { entry_id: entryId })),
  };
}
