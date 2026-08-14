import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, YStack } from 'tamagui';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DetailSkeleton } from '@/components/Skeleton';
import { StackScreen } from '@/components/StackScreen';
import {
  WhatsAppNoNumberNotice,
  WhatsAppPreferenceBulkButton,
  WhatsAppPreferenceSection,
} from '@/components/whatsapp-preference';
import { useTranslation } from '@/hooks/useTranslation';
import { useWhatsAppPreferences } from '@/hooks/useWhatsAppPreferences';
import type { RootStackParamList } from '@/navigation/types';

/**
 * WhatsApp Preference — RN twin of mWeb's WhatsAppPreferencePage (rule 27):
 * every kind of WhatsApp message Duncit sends, which ones this person still
 * wants, and which ones arrive whatever they choose.
 *
 * Unlike Mail Preference there is a state where nothing can be sent at all —
 * an account with no WhatsApp number on it. The switches still render then, so
 * the choice is made before the first message rather than after it.
 */
export function WhatsAppPreferenceScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const state = useWhatsAppPreferences();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const preference = state.preference;
  const optional = preference?.categories.filter((item) => !item.required) ?? [];
  const required = preference?.categories.filter((item) => item.required) ?? [];
  const allOff = optional.length > 0 && optional.every((item) => !item.enabled);
  // Hoisted out of the JSX so the branch sits at nesting zero (S3776) and the
  // body below stays a layout.
  const bulkLabel = allOff ? t('whatsappPreference.turnAllOn') : t('whatsappPreference.turnAllOff');
  const onBulkPress = () => {
    if (allOff) {
      state.setAll(true);
      return;
    }
    setConfirmOpen(true);
  };

  const bulkButton = (
    <WhatsAppPreferenceBulkButton
      label={bulkLabel}
      destructive={!allOff}
      disabled={state.busyCategory !== null}
      onPress={onBulkPress}
    />
  );

  const failed = state.loadFailed || !preference;
  const body = failed ? (
    <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
      <Text testID="whatsapp-preference-error" color="$muted">
        {t('whatsappPreference.loadFailed')}
      </Text>
    </YStack>
  ) : (
    <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
      <Text fontSize={12.5} color="$muted">
        {t('whatsappPreference.subtitle', { vars: { destination: preference.destination } })}
      </Text>

      {preference.reachable ? null : (
        <WhatsAppNoNumberNotice onAddNumber={() => navigation.navigate('Account')} />
      )}

      {state.saveFailed ? (
        <Text testID="whatsapp-preference-save-error" fontSize={12.5} color="$danger">
          {t('whatsappPreference.saveFailed')}
        </Text>
      ) : null}
      {state.saved && !state.saveFailed ? (
        <Text testID="whatsapp-preference-saved" fontSize={12.5} color="$success">
          {t('whatsappPreference.saved')}
        </Text>
      ) : null}

      <WhatsAppPreferenceSection
        heading={t('whatsappPreference.optionalHeading')}
        items={optional}
        busyCategory={state.busyCategory}
        onChange={state.setCategory}
        footer={bulkButton}
      />

      <WhatsAppPreferenceSection
        heading={t('whatsappPreference.requiredHeading')}
        hint={t('whatsappPreference.requiredHint')}
        items={required}
        busyCategory={state.busyCategory}
        onChange={state.setCategory}
      />
    </ScrollView>
  );

  return (
    <StackScreen title={t('whatsappPreference.title')} testID="whatsapp-preference-screen">
      {state.isLoading ? <DetailSkeleton testID="whatsapp-preference-loading" /> : body}

      <ConfirmDialog
        open={confirmOpen}
        testID="whatsapp-preference-confirm"
        title={t('whatsappPreference.turnAllOffTitle')}
        message={t('whatsappPreference.turnAllOffMessage')}
        confirmLabel={t('whatsappPreference.turnAllOff')}
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
