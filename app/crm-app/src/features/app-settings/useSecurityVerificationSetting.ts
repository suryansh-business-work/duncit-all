import { useState } from 'react';

import {
  CrmAppSecuritySettingsDocument,
  CrmAppUpdateSecuritySettingsDocument,
} from '@/graphql/crmAppSettings';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import type { Translate } from '@/i18n/fallback';
import { gqlRequest } from '@/services/graphql.client';

const NO_VARS = {};

/**
 * Whether a sign-in to this app asks for Security Verification — the CRM
 * portal's switch (CRM Mobile App › Settings), read and saved with its
 * operations. `value` is null until it has loaded; the server decides who may
 * change it and applies it to the next sign-in.
 */
export function useSecurityVerificationSetting(t: Translate) {
  const query = useGqlQuery(CrmAppSecuritySettingsDocument, NO_VARS, {
    fallbackError: t('crm.downloadApp.settings.security.loadFailed'),
  });
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (next: boolean) => {
    setBusy(true);
    try {
      const { updateCrmAppSettings } = await gqlRequest(CrmAppUpdateSecuritySettingsDocument, {
        input: { security_verification: next },
      });
      setSaved(updateCrmAppSettings.security_verification);
    } finally {
      setBusy(false);
    }
  };

  return {
    value: saved ?? query.data?.crmAppSettings.security_verification ?? null,
    loading: query.loading,
    error: query.error,
    refetch: query.refetch,
    busy,
    save,
  };
}
