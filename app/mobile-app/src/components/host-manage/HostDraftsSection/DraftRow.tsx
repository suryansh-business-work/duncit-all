import { MaterialIcons } from '@expo/vector-icons';
import { neutral } from '@duncit/auth-tokens';
import { draftHoursLeft, type ExpiringDraft } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

import { STEP_TITLES } from '@/components/create-pod';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDate } from '@/utils/date-format';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Dark ink on the amber CTA in both themes — what MUI's contained `warning`
 * button computes as its contrast text on mWeb (white on amber fails WCAG). */
const ON_WARNING = neutral[900];

export interface DraftRowData extends ExpiringDraft {
  id: string;
  pod_title: string;
  step: number;
  updated_at?: string | null;
}

interface Props {
  draft: DraftRowData;
  /** Inside the 24h deletion window: given a countdown and a warning CTA. */
  expiring: boolean;
  onContinue: (id: string) => void;
  onDelete: (id: string) => void;
}

/** One resumable draft row — the Tamagui twin of mWeb's DraftRow (rule 27). */
export function DraftRow({ draft, expiring, onContinue, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const { danger, warning } = useThemeColors();
  const step = Math.min(draft.step, STEP_TITLES.length - 1);
  const when = draft.updated_at ? formatDate(new Date(draft.updated_at)) : '';
  const hours = draftHoursLeft(draft);
  const countdown =
    hours > 0
      ? t('mweb.hostManage.draftExpiresInHours', { vars: { hours } })
      : t('mweb.hostManage.draftExpiresWithinHour');

  return (
    <XStack
      testID={expiring ? `draft-expiring-${draft.id}` : `draft-row-${draft.id}`}
      alignItems="center"
      gap={8}
      paddingHorizontal={16}
      paddingVertical={14}
    >
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {draft.pod_title || t('mweb.hostManage.untitledPod')}
        </Text>
        <Text fontSize={12} color="$muted" numberOfLines={1}>
          Step {step + 1}/{STEP_TITLES.length} · {STEP_TITLES[step]}
          {when ? ` · ${when}` : ''}
        </Text>
        {expiring ? (
          <XStack
            alignSelf="flex-start"
            marginTop={6}
            gap={4}
            height={24}
            paddingHorizontal={8}
            alignItems="center"
            borderRadius={999}
            borderWidth={1}
            borderColor={warning}
          >
            <MaterialIcons name="schedule" size={14} color={warning} />
            <Text fontSize={12} fontWeight="600" color={warning}>
              {countdown}
            </Text>
          </XStack>
        ) : null}
      </YStack>
      <XStack
        testID={`draft-continue-${draft.id}`}
        role="button"
        aria-label={t('mweb.hostManage.continueDraft')}
        onPress={() => onContinue(draft.id)}
        height={36}
        paddingHorizontal={14}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor={expiring ? warning : '$primary'}
        backgroundColor={expiring ? warning : 'transparent'}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={13} fontWeight="600" color={expiring ? ON_WARNING : '$primary'}>
          {t('mweb.common.continue')}
        </Text>
      </XStack>
      <XStack
        testID={`draft-delete-${draft.id}`}
        role="button"
        aria-label={t('mweb.common.deleteDraft2')}
        onPress={() => onDelete(draft.id)}
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        borderRadius={20}
        pressStyle={PRESS_STYLE.inline}
      >
        <MaterialIcons name="delete-outline" size={20} color={danger} />
      </XStack>
    </XStack>
  );
}
