import { useState } from 'react';
import { ScrollView, Text, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import { MailPreferenceBulkButton, MailPreferenceSection } from '@/components/mail-preference';
import { useMailPreferences } from '@/hooks/useMailPreferences';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Mail Preference — RN twin of mWeb's MailPreferencePage (rule 27): every kind
 * of email Duncit sends, which ones this person still wants, and which ones
 * arrive whatever they choose.
 *
 * The app shows the SIGNED-IN half only. The one-click unsubscribe link in an
 * email opens a browser, and that is mWeb's `/unsubscribe` — there is nothing
 * for a second copy of it to do here.
 */
export function MailPreferenceScreen() {
  const { t } = useTranslation();
  const state = useMailPreferences();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const preference = state.preference;
  const optional = preference?.categories.filter((item) => !item.required) ?? [];
  const required = preference?.categories.filter((item) => item.required) ?? [];
  const allOff = optional.length > 0 && optional.every((item) => !item.enabled);
  // Hoisted out of the JSX so the branch sits at nesting zero (S3776) and the
  // body below stays a layout.
  const bulkLabel = allOff
    ? t('mailPreference.resubscribeAll')
    : t('mailPreference.unsubscribeAll');
  // An opt-out is confirmed by email, so the saved line says so (S3776: the
  // branch sits at nesting zero rather than inside the JSX).
  const savedMessage = state.confirmationSent
    ? `${t('mailPreference.saved')} ${t('mailPreference.confirmationSent')}`
    : t('mailPreference.saved');
  const onBulkPress = () => {
    if (allOff) {
      state.setAll(true);
      return;
    }
    setConfirmOpen(true);
  };

  const bulkButton = (
    <MailPreferenceBulkButton
      label={bulkLabel}
      destructive={!allOff}
      disabled={state.busyCategory !== null}
      onPress={onBulkPress}
    />
  );

  const failed = state.loadFailed || !preference;
  const body = failed ? (
    <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
      <Text testID="mail-preference-error" color="$muted">
        {t('mailPreference.loadFailed')}
      </Text>
    </YStack>
  ) : (
    <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      <Text fontSize={12.5} color="$muted">
        {t('mailPreference.subtitle', { vars: { email: preference.email } })}
      </Text>

      {state.saveFailed ? (
        <Text testID="mail-preference-save-error" fontSize={12.5} color="$danger">
          {t('mailPreference.saveFailed')}
        </Text>
      ) : null}
      {state.saved && !state.saveFailed ? (
        <Text testID="mail-preference-saved" fontSize={12.5} color="$success">
          {savedMessage}
        </Text>
      ) : null}

      <MailPreferenceSection
        heading={t('mailPreference.optionalHeading')}
        items={optional}
        busyCategory={state.busyCategory}
        onChange={state.setCategory}
        footer={bulkButton}
      />

      <MailPreferenceSection
        heading={t('mailPreference.requiredHeading')}
        hint={t('mailPreference.requiredHint')}
        items={required}
        busyCategory={state.busyCategory}
        onChange={state.setCategory}
      />
    </ScrollView>
  );

  return (
    <StackScreen title={t('mailPreference.title')} testID="mail-preference-screen">
      {state.isLoading ? <DetailSkeleton testID="mail-preference-loading" /> : body}

      <ConfirmDialog
        open={confirmOpen}
        testID="mail-preference-confirm"
        title={t('mailPreference.unsubscribeAllTitle')}
        message={t('mailPreference.unsubscribeAllMessage')}
        confirmLabel={t('mailPreference.unsubscribeAll')}
        destructive
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          state.setAll(false);
        }}
      />
    </StackScreen>
  );
}
