import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';

export type DialerSegment = 'dialpad' | 'recents' | 'contacts';

const SEGMENTS: { key: DialerSegment; icon: keyof typeof MaterialIcons.glyphMap; label: string }[] =
  [
    { key: 'dialpad', icon: 'dialpad', label: 'crmApp.dialer.segmentDialpad' },
    { key: 'recents', icon: 'history', label: 'crmApp.dialer.segmentRecents' },
    { key: 'contacts', icon: 'groups', label: 'crmApp.dialer.segmentContacts' },
  ];

interface Props {
  value: DialerSegment;
  onChange: (next: DialerSegment) => void;
}

/** Dialpad · Call logs · Contacts: the current one filled with the accent, a tab list for screen readers. */
export function DialerSegments({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <XStack
      role="tablist"
      backgroundColor="$surface"
      borderRadius={RADII.lg}
      borderWidth={1}
      borderColor="$borderColor"
      padding="$1.5"
      gap="$1"
    >
      {SEGMENTS.map((s) => {
        const active = s.key === value;
        return (
          <XStack
            key={s.key}
            role="tab"
            aria-selected={active}
            aria-label={t(s.label)}
            onPress={() => onChange(s.key)}
            flex={1}
            minHeight={44}
            alignItems="center"
            justifyContent="center"
            gap="$1.5"
            borderRadius={RADII.pill}
            backgroundColor={active ? '$primary' : 'transparent'}
            pressStyle={{ backgroundColor: active ? '$primaryPress' : '$soft' }}
            testID={`dialer-segment-${s.key}`}
          >
            <MaterialIcons
              name={s.icon}
              size={20}
              color={active ? theme.onPrimary?.val : theme.muted?.val}
            />
            <Text color={active ? '$onPrimary' : '$color'} fontWeight="600" numberOfLines={1}>
              {t(s.label)}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}
