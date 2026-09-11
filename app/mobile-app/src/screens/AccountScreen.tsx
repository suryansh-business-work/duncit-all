import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, YStack } from 'tamagui';

import {
  AccountHealthCard,
  AccountInfoRow,
  AccountProfileHeader,
  CompletionMeter,
  ConnectedAccountsSection,
  EditAccountDialog,
  LanguageSection,
  PrivacyToggleCard,
  SecuritySection,
} from '@/components/account';
import { CommPreferenceEntryCard } from '@/components/comm-preference';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { DetailSkeleton } from '@/components/Skeleton';
import { useAccount } from '@/hooks/useAccount';
import { useLogout } from '@/hooks/useLogout';
import { ProfileVisibility } from '@/generated/graphql/graphql';
import type { RootStackParamList } from '@/navigation/types';
import { formatDate } from '@/utils/date-format';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** A hairline between grouped rows, inset past the row's icon disc. */
function RowDivider() {
  return <YStack height={1} marginLeft={68} backgroundColor="$borderColor" />;
}

/** Profile Settings — RN twin of mWeb's AccountPage: identity header with photo/
 * edit/logout, contact + location info, account health, and host/venue shortcuts. */
export function AccountScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { me, health, isLoading, error, setUsername, updateProfile, updateVisibility, refresh } =
    useAccount();
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
      <RefreshScrollView
        flex={1}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
      >
        {/* One order on both apps (rule 27): who you are, your details, how the
            account is doing, then the settings, with the danger corner last. */}
        <SurfaceCard padding={20}>
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
        </SurfaceCard>

        <SurfaceCard padding={0} overflow="hidden">
          <AccountInfoRow icon="email" label={t('mweb.common.email')} value={me.email || '—'} />
          <RowDivider />
          <AccountInfoRow
            icon="phone"
            label={t('mweb.common.phone')}
            value={me.phone_number ? `${me.phone_extension || ''} ${me.phone_number}`.trim() : '—'}
          />
          <RowDivider />
          <AccountInfoRow
            icon="location-city"
            label={t('mweb.common.location')}
            value={[me.city, me.state, me.country].filter(Boolean).join(' · ') || '—'}
          />
          <RowDivider />
          <AccountInfoRow
            icon="cake"
            label={t('mweb.common.dateOfBirth')}
            value={me.dob ? formatDate(me.dob) : '—'}
          />
          <YStack height={1} backgroundColor="$borderColor" />
          <YStack padding={16}>
            <CompletionMeter profile={me} />
          </YStack>
        </SurfaceCard>

        {health ? (
          <AccountHealthCard health={health} onPress={() => navigation.navigate('AccountHealth')} />
        ) : null}

        <PrivacyToggleCard
          isPrivate={me.profile_visibility === ProfileVisibility.Private}
          onChange={updateVisibility}
        />

        <LanguageSection />
        {/* One row, not three cards: the channels and every switch on them
            live behind it. The @handle is minted by the server and is shown —
            with the link it produces — on the profile itself, which is where
            somebody goes to share it. */}
        <CommPreferenceEntryCard onPress={() => navigation.navigate('CommPreference')} />
        <ConnectedAccountsSection />
        <SecuritySection />
      </RefreshScrollView>
    );

  return (
    <StackScreen title={t('mweb.account.profileSettings')} testID="account-screen">
      {isLoading && !me ? <DetailSkeleton testID="account-loading" /> : loaded}

      <EditAccountDialog
        open={editOpen}
        me={me}
        onClose={() => setEditOpen(false)}
        onSave={updateProfile}
        onSaveUsername={setUsername}
        // A proved contact change is already stored, so the account is
        // reloaded the moment it lands rather than waiting for a Save that
        // will not carry it.
        onContactChanged={() => {
          refresh().catch(() => undefined);
        }}
      />
    </StackScreen>
  );
}
