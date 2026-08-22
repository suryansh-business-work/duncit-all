import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, YStack } from 'tamagui';

import {
  AccountHealthCard,
  AccountInfoRow,
  AccountProfileHeader,
  CompletionMeter,
  ConnectedAccountsSection,
  EditAccountDialog,
  LanguageSection,
  MailPreferenceCard,
  PrivacyToggleCard,
  SecuritySection,
  WhatsAppPreferenceCard,
} from '@/components/account';
import { StackScreen } from '@/components/StackScreen';
import { DetailSkeleton } from '@/components/Skeleton';
import { useAccount } from '@/hooks/useAccount';
import { useLogout } from '@/hooks/useLogout';
import { ProfileVisibility } from '@/generated/graphql/graphql';
import type { RootStackParamList } from '@/navigation/types';
import { formatDate } from '@/utils/date-format';
import { useTranslation } from '@/hooks/useTranslation';

/** Profile Settings — RN twin of mWeb's AccountPage: identity header with photo/
 * edit/logout, contact + location info, account health, and host/venue shortcuts. */
export function AccountScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { me, health, isLoading, error, updateProfile, updateVisibility, refresh } = useAccount();
  const logout = useLogout();
  const [editOpen, setEditOpen] = useState(false);

  const loaded =
    error || !me ? (
      <YStack flex={1} alignItems="center" justifyContent="center" padding={24}>
        <Text testID="account-error" color="$muted">
          Unable to load profile.
        </Text>
      </YStack>
    ) : (
      <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <YStack
          borderRadius={18}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          padding={16}
          gap={16}
        >
          <AccountProfileHeader
            me={me}
            onEdit={() => setEditOpen(true)}
            onLogout={() => {
              logout();
            }}
            onChanged={() => {
              refresh();
            }}
          />
          <YStack height={1} backgroundColor="$borderColor" />
          <YStack gap={14}>
            <AccountInfoRow icon="email" label={t('mweb.common.email')} value={me.email || '—'} />
            <AccountInfoRow
              icon="phone"
              label={t('mweb.common.phone')}
              value={
                me.phone_number ? `${me.phone_extension || ''} ${me.phone_number}`.trim() : '—'
              }
            />
            <AccountInfoRow
              icon="location-city"
              label={t('mweb.common.location')}
              value={[me.city, me.state, me.country].filter(Boolean).join(' · ') || '—'}
            />
            <AccountInfoRow
              icon="cake"
              label={t('mweb.common.dateOfBirth')}
              value={me.dob ? formatDate(me.dob) : '—'}
            />
          </YStack>
          <YStack height={1} backgroundColor="$borderColor" />
          <CompletionMeter profile={me} />
        </YStack>

        <PrivacyToggleCard
          isPrivate={me.profile_visibility === ProfileVisibility.Private}
          onChange={updateVisibility}
        />

        {health ? (
          <AccountHealthCard health={health} onPress={() => navigation.navigate('AccountHealth')} />
        ) : null}

        <YStack height={1} backgroundColor="$borderColor" />
        <LanguageSection />
        <MailPreferenceCard onPress={() => navigation.navigate('MailPreference')} />
        <WhatsAppPreferenceCard onPress={() => navigation.navigate('WhatsAppPreference')} />
        <ConnectedAccountsSection />
        <SecuritySection />
      </ScrollView>
    );

  return (
    <StackScreen title={t('mweb.account.profileSettings')} testID="account-screen">
      {isLoading && !me ? <DetailSkeleton testID="account-loading" /> : loaded}

      <EditAccountDialog
        open={editOpen}
        me={me}
        onClose={() => setEditOpen(false)}
        onSave={updateProfile}
      />
    </StackScreen>
  );
}
