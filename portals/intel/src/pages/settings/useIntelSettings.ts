import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { INTEL_BOOTSTRAP } from '../../graphql/chat';
import { INTEL_SETTINGS, INTEL_UPDATE_SETTINGS, type SettingsData, type UpdateSettingsData } from '../../graphql/admin';
import { parseSettings, type IntelSettingsValue, type SettingsSectionKey } from './settings.types';

/**
 * Loads the settings document and saves one section at a time. The revision
 * the editor loaded goes with every save, so a save on top of someone else's
 * newer one is refused (CONFLICT) instead of silently undoing it.
 */
export function useIntelSettings() {
  const { t } = useTranslation();
  const [saveError, setSaveError] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<SettingsData>(INTEL_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [update, { loading: saving }] = useMutation<UpdateSettingsData>(INTEL_UPDATE_SETTINGS, {
    refetchQueries: [INTEL_BOOTSTRAP],
    update(cache, { data: saved }) {
      if (saved) cache.writeQuery({ query: INTEL_SETTINGS, data: { intelSettings: saved.intelUpdateSettings } });
    },
  });
  const value = useMemo<IntelSettingsValue | null>(() => (data ? parseSettings(data.intelSettings.json) : null), [data]);

  const save = async <K extends SettingsSectionKey>(section: K, next: IntelSettingsValue[K]): Promise<boolean> => {
    setSaveError(null);
    try {
      await update({ variables: { section, value: JSON.stringify(next), revision: data?.intelSettings.revision ?? 0 } });
      notifySuccess(t('intel.settings.saved'));
      return true;
    } catch (err) {
      setSaveError(parseApiError(err, t('intel.settings.saveFailed')));
      return false;
    }
  };

  return { value, loading: loading && !data, error: error ?? null, refetch, save, saving, saveError };
}
