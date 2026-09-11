import { memo } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { followButtonLabelKey, readFollowStatus } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { FollowStatusButton } from '@/components/FollowStatusButton';
import type { ContactRow as ContactRowData } from '@/hooks/useContacts';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  row: ContactRowData;
  busy: boolean;
  /** Stable across renders, so a memoised row only redraws when it changed. */
  onToggleFollow: (row: ContactRowData) => void;
  onOpen: (userId: string) => void;
}

/** Avatar, name, @handle, the phone-book name it was saved under and the
 * three-state follow button; the identity opens the profile. Memoised: it is
 * one cell of a virtualised list thousands long. Twin of mWeb's `ContactRow`
 * (rule 27). */
export const ContactRow = memo(function ContactRow({
  row,
  busy,
  onToggleFollow,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { profile } = row;
  const name = profile.full_name || profile.first_name || row.contact_label;
  const initial = (name[0] ?? '?').toUpperCase();
  const status = readFollowStatus(profile);
  const savedAs =
    row.contact_label && row.contact_label !== name
      ? t('mweb.contacts.savedAs', { vars: { label: row.contact_label } })
      : '';

  return (
    <XStack
      testID={`contact-row-${profile.user_id}`}
      alignItems="center"
      gap={12}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack
        testID={`contact-open-${profile.user_id}`}
        role="button"
        aria-label={t('mweb.podDetails.openProfileOf', { vars: { name } })}
        onPress={() => onOpen(profile.user_id)}
        alignItems="center"
        gap={12}
        flex={1}
        pressStyle={PRESS_STYLE.control}
      >
        {profile.profile_photo ? (
          <AppImage
            source={{ uri: profile.profile_photo }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
        ) : (
          <YStack
            width={44}
            height={44}
            borderRadius={22}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={16} fontWeight="700" color="$onPrimary">
              {initial}
            </Text>
          </YStack>
        )}
        <YStack flex={1}>
          <XStack alignItems="center" gap={6}>
            <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1} flexShrink={1}>
              {name}
            </Text>
            {row.is_nearby ? (
              <XStack
                paddingHorizontal={8}
                paddingVertical={2}
                borderRadius={999}
                borderWidth={1}
                borderColor="$primary"
              >
                <Text fontSize={10.5} fontWeight="700" color="$primary">
                  {t('mweb.contacts.nearbyBadge')}
                </Text>
              </XStack>
            ) : null}
          </XStack>
          <Text fontSize={12.5} color="$muted" numberOfLines={1}>
            {[`@${profile.username}`, savedAs].filter(Boolean).join(' · ')}
          </Text>
        </YStack>
      </XStack>
      <FollowStatusButton
        testID={`contact-follow-${profile.user_id}`}
        status={status}
        label={t(followButtonLabelKey(status, profile.follows_viewer))}
        busy={busy}
        onPress={() => onToggleFollow(row)}
      />
    </XStack>
  );
});
