import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Divider } from '@mui/material';
import { whatsappCategoryCopy } from '@duncit/app-settings';
import { useTranslation } from '../../../i18n/useTranslation';
import { ProfileSection } from '../ProfileSection';
import {
  MY_WHATSAPP_PREFERENCE,
  SET_MY_WHATSAPP_PREFERENCE,
  type WhatsAppPreference,
} from './queries';
import { SectionStatus } from './SectionStatus';
import { SwitchRow } from './SwitchRow';
import { useSwitchSave } from './useSwitchSave';

/**
 * Which WhatsApp messages this account receives — mWeb's WhatsApp Preference
 * rules. With no sendable number the switches still render, so a preference
 * can be set before the first message rather than after it.
 */
export function WhatsAppPreferencesCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ myWhatsappPreference: WhatsAppPreference }>(
    MY_WHATSAPP_PREFERENCE,
    { fetchPolicy: 'cache-and-network' },
  );
  const [setOne] = useMutation(SET_MY_WHATSAPP_PREFERENCE);
  const save = useSwitchSave('whatsappPreference');
  const sheet = data?.myWhatsappPreference ?? null;
  const subtitle =
    sheet?.reachable && sheet.destination
      ? t('whatsappPreference.subtitle', { vars: { destination: sheet.destination } })
      : undefined;

  return (
    <ProfileSection
      testId="profile-whatsapp-preferences"
      title={t('shell.profile.notifications.whatsappTitle')}
      description={subtitle}
    >
      <SectionStatus
        loading={loading && !sheet}
        loadFailed={!!error && !sheet}
        loadFailedText={t('whatsappPreference.loadFailed')}
        saveFailed={save.saveFailed}
        saveFailedText={t('whatsappPreference.saveFailed')}
        saved={save.saved}
        savedText={t('whatsappPreference.saved')}
        onDismissSaved={save.dismissSaved}
      />
      {sheet && !sheet.reachable && (
        <Alert severity="info" sx={{ mb: 1 }} data-testid="whatsapp-no-number">
          <strong>{t('whatsappPreference.noNumberTitle')}</strong> {t('whatsappPreference.noNumberBody')}
        </Alert>
      )}
      {sheet?.categories.map((item, index) => {
        const copy = whatsappCategoryCopy(t, item.category);
        return (
          <div key={item.category}>
            {index > 0 && <Divider />}
            <SwitchRow
              testId={`whatsapp-preference-${item.category}`}
              label={copy.label}
              description={copy.description}
              checked={item.enabled}
              locked={item.required}
              lockedLabel={t('whatsappPreference.alwaysOn')}
              busy={save.busyKey === item.category}
              onChange={(enabled) =>
                save.run(item.category, () =>
                  setOne({ variables: { category: item.category, enabled } }),
                )
              }
            />
          </div>
        );
      })}
    </ProfileSection>
  );
}
