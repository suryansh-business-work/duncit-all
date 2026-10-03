import { useMutation, useQuery } from '@apollo/client/react';
import { Divider } from '@mui/material';
import { mailCategoryCopy } from '@duncit/app-settings';
import { useTranslation } from '../../../i18n/useTranslation';
import { ProfileSection } from '../ProfileSection';
import { MY_MAIL_PREFERENCES, SET_MY_MAIL_PREFERENCE, type MailPreference } from './queries';
import { SectionStatus } from './SectionStatus';
import { SwitchRow } from './SwitchRow';
import { useSwitchSave } from './useSwitchSave';

/**
 * Which emails this account receives — the same categories and server rules as
 * mWeb's Mail Preference screen. The mutation answers with the whole sheet, so
 * the cache lands on the shape the query wrote and nothing is refetched.
 */
export function MailPreferencesCard() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ myMailPreferences: MailPreference }>(
    MY_MAIL_PREFERENCES,
    { fetchPolicy: 'cache-and-network' },
  );
  const [setOne] = useMutation(SET_MY_MAIL_PREFERENCE);
  const save = useSwitchSave('mailPreference');
  const sheet = data?.myMailPreferences ?? null;

  return (
    <ProfileSection
      testId="profile-mail-preferences"
      title={t('shell.profile.notifications.emailTitle')}
      description={sheet ? t('mailPreference.subtitle', { vars: { email: sheet.email } }) : undefined}
    >
      <SectionStatus
        loading={loading && !sheet}
        loadFailed={!!error && !sheet}
        loadFailedText={t('mailPreference.loadFailed')}
        saveFailed={save.saveFailed}
        saveFailedText={t('mailPreference.saveFailed')}
        saved={save.saved}
        savedText={t('mailPreference.saved')}
        onDismissSaved={save.dismissSaved}
      />
      {sheet?.categories.map((item, index) => {
        const copy = mailCategoryCopy(t, item.category);
        return (
          <div key={item.category}>
            {index > 0 && <Divider />}
            <SwitchRow
              testId={`mail-preference-${item.category}`}
              label={copy.label}
              description={copy.description}
              checked={item.enabled}
              locked={item.required}
              lockedLabel={t('mailPreference.alwaysOn')}
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
