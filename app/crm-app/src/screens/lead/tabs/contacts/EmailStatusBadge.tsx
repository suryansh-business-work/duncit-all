import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, useTheme } from 'tamagui';
import { fireAndForget, logs } from '@duncit/logs';
import type { CrmTone } from '@duncit/utils';

import { RADII } from '@/constants/design';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import type { IconName } from '../parts/DetailCard';
import type { EmailStatuses } from './useEmailStatuses';

/** Each verdict's copy key, icon and tone — the portal's EmailStatusChip (literal keys for the localization gate). */
const STATUS_VIEW: Readonly<Record<string, { labelKey: string; icon: IconName; tone: CrmTone }>> = {
  VERIFIED: { labelKey: 'crm.emailVerifier.statusVerified', icon: 'check-circle', tone: 'success' },
  RISKY: { labelKey: 'crm.emailVerifier.statusRisky', icon: 'error-outline', tone: 'warning' },
  INVALID: { labelKey: 'crm.emailVerifier.statusInvalid', icon: 'cancel', tone: 'error' },
  UNKNOWN: { labelKey: 'crm.emailVerifier.statusUnknown', icon: 'help-outline', tone: 'default' },
  NOT_CHECKED: {
    labelKey: 'crm.emailVerifier.statusNotChecked',
    icon: 'mark-email-unread',
    tone: 'default',
  },
};

const TONE_COLOR: Record<CrmTone, 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
  default: 'muted',
};

/**
 * The verification status beside an email, as everywhere in the CRM: a green
 * tick for a verified mailbox, "Not checked" until someone checks it. Tapping
 * it runs a check now (or again).
 */
export function EmailStatusBadge({
  email,
  statuses,
}: Readonly<{ email: string; statuses: EmailStatuses }>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const entry = statuses.get(email);
  const status = entry?.status;
  const view = status ? STATUS_VIEW[status] : undefined;
  if (!entry || !status || !view) return null;
  if (entry.checking) {
    return (
      <Spinner
        size="small"
        color="$accentText"
        aria-label={t('crm.emailVerifier.checking')}
        testID="email-status-checking"
      />
    );
  }
  const colour = TONE_COLOR[view.tone];
  const hint = entry.checkedAt
    ? t('crm.emailVerifier.checkedAt', { vars: { date: displayDateTime(entry.checkedAt) } })
    : t('crm.emailVerifier.clickToCheck');
  const suggestion = entry.suggestion
    ? t('crm.emailVerifier.didYouMean', { vars: { email: entry.suggestion } })
    : '';
  return (
    <XStack
      role="button"
      aria-label={[t(view.labelKey), hint, suggestion].filter(Boolean).join('. ')}
      alignItems="center"
      gap="$1"
      borderWidth={1}
      borderColor={`$${colour}`}
      borderRadius={RADII.pill}
      paddingHorizontal="$2"
      paddingVertical="$1"
      hitSlop={10}
      onPress={() =>
        fireAndForget(statuses.verify(email), logs.mobileApp, 'crm-app/EmailStatusBadge', 'verify')
      }
      testID={`email-status-${status.toLowerCase()}`}
    >
      <MaterialIcons
        name={view.icon}
        size={14}
        color={theme[colour]?.val}
        accessibilityElementsHidden
      />
      <Text color={`$${colour}`} fontSize="$1" fontWeight="700">
        {t(view.labelKey)}
      </Text>
    </XStack>
  );
}
