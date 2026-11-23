import type { ReactNode } from 'react';
import { Alert, Button, Skeleton } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import type { IntelSettingsValue, SettingsSectionKey } from './settings.types';
import { useIntelSettings } from './useIntelSettings';

export interface SectionEditorProps<K extends SettingsSectionKey> {
  value: IntelSettingsValue[K];
  all: IntelSettingsValue;
  saving: boolean;
  errorMessage: string | null;
  onSave: (next: IntelSettingsValue[K]) => void;
}

interface Props<K extends SettingsSectionKey> {
  section: K;
  title: string;
  subtitle: string;
  children: (editor: SectionEditorProps<K>) => ReactNode;
}

/** Loads the settings document, then renders one section's editor in a card — with loading and error states. */
export default function SettingsCard<K extends SettingsSectionKey>({ section, title, subtitle, children }: Readonly<Props<K>>) {
  const { t } = useTranslation();
  const settings = useIntelSettings();
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {settings.error && !settings.value && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => settings.refetch().catch(() => undefined)}>{t('intel.common.retry')}</Button>}>
          {t('intel.settings.loadFailed')}
        </Alert>
      )}
      {settings.loading && <Skeleton variant="rounded" height={180} />}
      {settings.value &&
        children({
          value: settings.value[section],
          all: settings.value,
          saving: settings.saving,
          errorMessage: settings.saveError,
          onSave: (next) => {
            settings.save(section, next).catch(() => undefined);
          },
        })}
    </SectionCard>
  );
}
