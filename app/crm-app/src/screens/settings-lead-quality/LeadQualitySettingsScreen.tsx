import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { Text, XStack, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { QUALITY_LEAD_TYPES } from '@/generated/lead-quality-rules';
import type { LeadKind } from '@/features/leads/leadKinds';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { LeadTypeSettings } from './LeadTypeSettings';

/** Each lead type's name, as the portal's tabs word it (literal keys, so the localization gate sees them). */
const LEAD_TYPE_LABEL_KEY: Record<LeadKind, string> = {
  HOST_LEAD: 'crm.calendar.hostLead',
  VENUE_LEAD: 'crm.calendar.venueLead',
  COMMUNITY_LEAD: 'crm.calendar.communityLead',
  CREATOR_LEAD: 'crm.calendar.creatorLead',
  ECOMM_LEAD: 'crm.calendar.ecommLead',
};

/**
 * CRM › Leads › Settings › Lead Quality Score: how each lead type is scored out
 * of 100. One tab per lead type; each has its own published version, an
 * optional draft and its version history.
 */
export function LeadQualitySettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { params } = useRoute<RouteProp<AppStackParamList, 'LeadQualitySettings'>>();
  const [leadType, setLeadType] = useState<LeadKind>(params?.leadType ?? 'HOST_LEAD');

  useEffect(() => {
    navigation.setOptions({ title: t('crm.leadQualitySettings.title') });
  }, [navigation, t]);

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
      >
        <XStack alignItems="center" gap="$2">
          <MaterialIcons
            name="tune"
            size={24}
            color={theme.accentText?.val}
            accessibilityElementsHidden
          />
          <YStack flex={1}>
            <Text fontSize="$7" fontWeight="800" role="heading">
              {t('crm.leadQualitySettings.title')}
            </Text>
            <Text color="$muted" fontSize="$2">
              {t('crm.leadQualitySettings.subtitle')}
            </Text>
          </YStack>
        </XStack>
        <XStack
          flexWrap="wrap"
          gap="$2"
          role="tablist"
          aria-label={t('crm.leadQualitySettings.leadTypesAria')}
        >
          {QUALITY_LEAD_TYPES.map((type) => (
            <DuncitButton
              key={type}
              label={t(LEAD_TYPE_LABEL_KEY[type])}
              onPress={() => setLeadType(type)}
              size="sm"
              variant={leadType === type ? 'solid' : 'outline'}
              testID={`lead-quality-tab-${type}`}
            />
          ))}
        </XStack>
        <LeadTypeSettings
          key={leadType}
          leadType={leadType}
          typeLabel={t(LEAD_TYPE_LABEL_KEY[leadType])}
        />
      </ScrollView>
    </YStack>
  );
}
