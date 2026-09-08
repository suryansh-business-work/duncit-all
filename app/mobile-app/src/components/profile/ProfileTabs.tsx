import { Text, XStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export type ProfileTab = 'posts' | 'joined' | 'hosted';

interface Props {
  value: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  /** Whether the third tab (the pods this person hosts) exists at all. */
  isHost: boolean;
  /** Own profile says "My Pods"; somebody else's says "Their Pods". */
  isOwner: boolean;
}

/**
 * The strip over a profile's content: Posts, Joined Pods and — for a host —
 * the pods they run. Twin of mWeb's `ProfileTabs` (rule 27); native has no URL
 * to hold the selection, so the screen keeps it in state.
 */
export function ProfileTabs({ value, onChange, isHost, isOwner }: Readonly<Props>) {
  const { t } = useTranslation();
  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'posts', label: t('mweb.profile.tabPosts') },
    { key: 'joined', label: t('mweb.podHistory.joinedPods') },
  ];
  if (isHost) {
    tabs.push({
      key: 'hosted',
      label: isOwner ? t('mweb.profile.tabMyPods') : t('mweb.profile.tabTheirPods'),
    });
  }
  return (
    <XStack
      gap={8}
      paddingHorizontal={16}
      paddingVertical={8}
      role="tablist"
      aria-label={t('mweb.profile.profileSections')}
    >
      {tabs.map((tab) => {
        const selected = value === tab.key;
        return (
          <XStack
            key={tab.key}
            testID={`profile-tab-${tab.key}`}
            role="tab"
            aria-selected={selected}
            onPress={() => onChange(tab.key)}
            flex={1}
            height={36}
            alignItems="center"
            justifyContent="center"
            borderRadius={12}
            backgroundColor={selected ? '$primary' : '$surface'}
            borderWidth={1}
            borderColor={selected ? '$primary' : '$borderColor'}
            pressStyle={PRESS_STYLE.control}
          >
            <Text
              fontSize={13}
              fontWeight="700"
              color={selected ? '$onPrimary' : '$color'}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
