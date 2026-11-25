import { useEffect, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { YStack } from 'tamagui';

import { hasPhoneFeatures } from '@/services/permissions';
import { dialable } from '@/services/dialer';
import type { TabParamList } from '@/navigation/types';
import { CrmContacts } from './CrmContacts';
import { DialerSegments, type DialerSegment } from './DialerSegments';
import { DialPad } from './DialPad';
import { RecentCrmCalls } from './RecentCrmCalls';

/**
 * The Duncit CRM dialer: Dialpad (type a number, see at once who it is in the
 * CRM, call), Call logs (this phone's recent calls with CRM contacts) and
 * Contacts (the CRM's numbers, searchable offline). Opened from the tab, the
 * widget, the home-screen Dialer icon, the app shortcut or a tapped number.
 * An iPhone has no call log or offline directory, so it shows the dial pad only.
 */
export function DialerScreen() {
  const { params } = useRoute<RouteProp<TabParamList, 'Dialer'>>();
  const [number, setNumber] = useState(() => dialable(params?.number ?? ''));
  const [segment, setSegment] = useState<DialerSegment>('dialpad');
  const phone = hasPhoneFeatures();

  useEffect(() => {
    if (!params?.number) return;
    setNumber(dialable(params.number));
    setSegment('dialpad');
  }, [params?.number]);

  const pick = (picked: string) => {
    setNumber(dialable(picked));
    setSegment('dialpad');
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {phone ? (
        <YStack paddingHorizontal="$4" paddingTop="$3">
          <DialerSegments value={segment} onChange={setSegment} />
        </YStack>
      ) : null}
      {segment === 'dialpad' || !phone ? <DialPad number={number} onNumber={setNumber} /> : null}
      {phone && segment === 'recents' ? <RecentCrmCalls onPick={pick} /> : null}
      {phone && segment === 'contacts' ? <CrmContacts onPick={pick} /> : null}
    </YStack>
  );
}
