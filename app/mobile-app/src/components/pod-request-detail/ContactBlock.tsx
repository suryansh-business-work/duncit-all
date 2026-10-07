import { Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { usePodRequestDetail } from '@/hooks/usePodRequestDetail';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { fireAndForget } from '@/utils/fire-and-forget';

type Detail = ReturnType<typeof usePodRequestDetail>;

interface Props {
  request: NonNullable<Detail['request']>;
  pod: Detail['pod'];
}

/**
 * The other side's contact — the API fills it only once the pod exists, so
 * until then the block says when it will be shared. With the pod: View pod.
 */
export function ContactBlock({ request, pod }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const contact = request.contact;
  const rows = contact
    ? [
        {
          key: 'phone',
          label: t('podRequests.phone'),
          value: contact.phone,
          href: `tel:${contact.phone}`,
        },
        {
          key: 'email',
          label: t('podRequests.email'),
          value: contact.email,
          href: `mailto:${contact.email}`,
        },
        { key: 'address', label: t('podRequests.address'), value: contact.address ?? '', href: '' },
      ].filter((row) => row.value)
    : [];

  return (
    <SurfaceCard testID="pod-request-contact" gap={10}>
      <Text fontSize={12} fontWeight="600" color="$muted">
        {t('podRequests.contactTitle')}
      </Text>
      {rows.length === 0 ? (
        <Text testID="pod-request-contact-hidden" fontSize={14} color="$muted">
          {t('podRequests.contactHidden')}
        </Text>
      ) : null}
      {rows.map((row) => (
        <XStack key={row.key} gap={10} alignItems="baseline">
          <Text fontSize={13} color="$muted" minWidth={72}>
            {row.label}
          </Text>
          <YStack flex={1}>
            {row.href ? (
              <Text
                role="link"
                fontSize={14}
                fontWeight="600"
                color="$primary"
                pressStyle={PRESS_STYLE.inline}
                onPress={() => fireAndForget(Linking.openURL(row.href))}
                testID={`pod-request-contact-${row.key}`}
              >
                {row.value}
              </Text>
            ) : (
              <Text fontSize={14} fontWeight="600" color="$color">
                {row.value}
              </Text>
            )}
          </YStack>
        </XStack>
      ))}
      {pod?.club_slug && pod.pod_id ? (
        <XStack>
          <DuncitButton
            testID="pod-request-view-pod"
            label={t('podRequests.viewPod')}
            variant="outline"
            icon={<MaterialIcons name="open-in-new" size={18} color={primary} />}
            onPress={() =>
              navigation.navigate('PodDetails', { clubSlug: pod.club_slug, podSlug: pod.pod_id })
            }
          />
        </XStack>
      ) : null}
    </SurfaceCard>
  );
}
