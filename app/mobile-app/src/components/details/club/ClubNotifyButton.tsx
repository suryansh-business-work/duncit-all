import { useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Sheet, Text, XStack, YStack } from 'tamagui';
import { getItem, setItem } from '@/services/secure-storage';
import { useThemeColors } from '@/hooks/useThemeColors';

type NotifyPref = 'ALL' | 'PODS' | 'IMPORTANT' | 'OFF';

const STORAGE_KEY = (id: string) => `club_notify_${id}`;

const OPTIONS: {
  value: NotifyPref;
  label: string;
  icon: 'notifications-active' | 'podcasts' | 'campaign' | 'notifications-off';
}[] = [
  { value: 'ALL', label: 'All notifications', icon: 'notifications-active' },
  { value: 'PODS', label: 'Pods only', icon: 'podcasts' },
  { value: 'IMPORTANT', label: 'Important only', icon: 'campaign' },
  { value: 'OFF', label: 'Mute', icon: 'notifications-off' },
];

interface Props {
  clubId: string;
}

export function ClubNotifyButton({ clubId }: Readonly<Props>) {
  const { primary, color } = useThemeColors();
  const [pref, setPref] = useState<NotifyPref | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getItem(STORAGE_KEY(clubId))
      .then((v) => {
        if (v) setPref(v as NotifyPref);
      })
      .catch(() => null);
  }, [clubId]);

  const isActive = pref !== null && pref !== 'OFF';

  const handleSelect = async (value: NotifyPref) => {
    setPref(value);
    setOpen(false);
    await setItem(STORAGE_KEY(clubId), value).catch(() => null);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        accessibilityLabel={pref ? `Notifications: ${pref}` : 'Subscribe to notifications'}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons
          name={isActive ? 'notifications-active' : 'notifications-none'}
          size={22}
          color={isActive ? primary : color}
        />
      </TouchableOpacity>

      <Sheet open={open} onOpenChange={setOpen} snapPoints={[300]} dismissOnSnapToBottom>
        <Sheet.Overlay />
        <Sheet.Frame borderTopLeftRadius={20} borderTopRightRadius={20} padding={20}>
          <Text fontSize={17} fontWeight="900" color="$color" marginBottom={16}>
            Club Notifications
          </Text>
          <YStack gap={4}>
            {OPTIONS.map(({ value, label, icon }) => (
              <TouchableOpacity key={value} onPress={() => void handleSelect(value)}>
                <XStack
                  alignItems="center"
                  gap={12}
                  padding={12}
                  borderRadius={12}
                  backgroundColor={pref === value ? '$primaryLight' : 'transparent'}
                >
                  <MaterialIcons name={icon} size={20} color={pref === value ? primary : color} />
                  <Text fontSize={15} fontWeight={pref === value ? '900' : '600'} color="$color">
                    {label}
                  </Text>
                  {pref === value ? (
                    <XStack flex={1} justifyContent="flex-end">
                      <MaterialIcons name="check" size={18} color={primary} />
                    </XStack>
                  ) : null}
                </XStack>
              </TouchableOpacity>
            ))}
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </>
  );
}
