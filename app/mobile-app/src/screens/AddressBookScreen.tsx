import { ScrollView } from 'tamagui';

import { AddressBookSection } from '@/components/account';
import { StackScreen } from '@/components/StackScreen';

/** Address Book — the user's saved delivery addresses, now a standalone screen
 * reachable from the sidebar Shop section (previously embedded in Profile
 * Settings). RN twin of mWeb's /address-book page. */
export function AddressBookScreen() {
  return (
    <StackScreen title="Address Book" testID="address-book-screen">
      <ScrollView
        flex={1}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <AddressBookSection />
      </ScrollView>
    </StackScreen>
  );
}
