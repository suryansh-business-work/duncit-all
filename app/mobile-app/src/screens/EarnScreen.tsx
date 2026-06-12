import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, YStack } from 'tamagui';

import { EarnBox } from '@/components/earn/EarnBox';
import { StackScreen } from '@/components/StackScreen';
import { useMe } from '@/hooks/useMe';
import { MyMeetingsDocument, type MyMeetingsResult } from '@/graphql/onboarding-survey';
import { graphqlRequest } from '@/services/graphql.client';
import type { RootStackParamList } from '@/navigation/types';

const BOXES = [
  {
    role: 'HOST',
    kind: 'HOST',
    title: 'By hosting a pod',
    description: 'Run meetups and experiences for your community and earn from paid pods.',
    icon: 'dashboard',
    route: 'BecomeHost',
  },
  {
    role: 'VENUE_OWNER',
    kind: 'VENUE',
    title: 'By registering your venue',
    description: 'List your space as a Duncit venue and host pods or rent it out.',
    icon: 'store',
    route: 'RegisterVenue',
  },
  {
    role: 'ECOMM_MANAGER',
    kind: 'ECOMM',
    title: 'By listing your product',
    description: 'Sell your products to the Duncit community through pods and the shop.',
    icon: 'inventory-2',
    route: 'ListProduct',
  },
] as const;

const PENDING = new Set(['REQUESTED', 'SCHEDULED']);

type EarnMeeting = MyMeetingsResult['myMeetings'][number];

const meetingNotice = (meeting: EarnMeeting) => {
  const at = meeting.scheduled_at ?? meeting.requested_at;
  const when = at
    ? new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '';
  return `You already have an onboarding meeting scheduled for this${when ? ` on ${when}` : ''}. Our team will meet you then — this option unlocks once the meeting is done.`;
};

/** "Earn with Duncit" — three ways to start earning; a box is disabled when the
 * user already holds the matching role or has a pending onboarding meeting. */
export function EarnScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const roles = useMe().data?.me?.roles ?? [];
  const [meetings, setMeetings] = useState<EarnMeeting[]>([]);

  useEffect(() => {
    let active = true;
    graphqlRequest<MyMeetingsResult>(MyMeetingsDocument, undefined, { auth: true })
      .then((res) => active && setMeetings(res.myMeetings))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <StackScreen title="Earn with Duncit" testID="earn-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={40}>
          <Text fontSize={13} color="$muted">
            Pick a way to start earning on Duncit.
          </Text>
          {BOXES.map((box) => {
            const hasRole = roles.includes(box.role);
            const pendingMeeting = meetings.find(
              (m) => m.kind === box.kind && PENDING.has(m.status),
            );
            const showMeetingNotice = !hasRole && !!pendingMeeting;
            let disabledLabel = 'Already enabled';
            if (showMeetingNotice) disabledLabel = 'Meeting scheduled';
            return (
              <EarnBox
                key={box.role}
                testID={`earn-box-${box.role}`}
                title={box.title}
                description={showMeetingNotice ? meetingNotice(pendingMeeting) : box.description}
                icon={box.icon}
                disabled={hasRole || showMeetingNotice}
                disabledLabel={disabledLabel}
                onPress={() => navigation.navigate(box.route)}
              />
            );
          })}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
