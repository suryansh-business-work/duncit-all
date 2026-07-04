import { useState } from 'react';
import { AppImage } from '@/components/AppImage';

import { Text, XStack, YStack } from 'tamagui';

import { Sidebar } from '@/components/Sidebar';
import { useMe } from '@/hooks/useMe';

/**
 * Header avatar that opens the account drawer — the mobile twin of mWeb's
 * header <Avatar> + <ProfileDrawer> pair. Falls back to the user's initial.
 */
export function AccountButton() {
  const [open, setOpen] = useState(false);
  const { data } = useMe();
  const me = data?.me;
  const initial = (me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <>
      <XStack
        testID="account-button"
        role="button"
        aria-label="Open account menu"
        onPress={() => setOpen(true)}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
      >
        {me?.profile_photo ? (
          <AppImage
            testID="account-avatar-image"
            source={{ uri: me.profile_photo }}
            style={{ width: 34, height: 34, borderRadius: 17 }}
          />
        ) : (
          <YStack
            width={36}
            height={36}
            alignItems="center"
            justifyContent="center"
            borderRadius={18}
            backgroundColor="$primary"
          >
            <Text fontSize={14} fontWeight="800" color="$onPrimary">
              {initial}
            </Text>
          </YStack>
        )}
      </XStack>
      <Sidebar open={open} onClose={() => setOpen(false)} />
    </>
  );
}
