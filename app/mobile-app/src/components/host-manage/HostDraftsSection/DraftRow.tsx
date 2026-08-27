import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { draftHoursLeft, type ExpiringDraft } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

import { STEP_TITLES } from '@/components/create-pod';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDate } from '@/utils/date-format';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface DraftRowData extends ExpiringDraft {
  id: string;
  pod_title: string;
  step: number;
  updated_at?: string | null;
}

interface Props {
  draft: DraftRowData;
  /** Inside the 24h deletion window: tinted, outlined and given a countdown. */
  expiring: boolean;
  onContinue: (id: string) => void;
  onDelete: (id: string) => void;
}

/** One resumable draft — the Tamagui twin of mWeb's DraftRow (rule 27). */
export function DraftRow({ draft, expiring, onContinue, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const { danger } = useThemeColors();
  const step = Math.min(draft.step, STEP_TITLES.length - 1);
  const when = draft.updated_at ? formatDate(new Date(draft.updated_at)) : '';
  const hours = draftHoursLeft(draft);
  const countdown =
    hours > 0
      ? t('mweb.hostManage.draftExpiresInHours', { vars: { hours } })
      : t('mweb.hostManage.draftExpiresWithinHour');

  return (
    <YStack
      testID={expiring ? `draft-expiring-${draft.id}` : `draft-row-${draft.id}`}
      gap={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor={expiring ? semantic.warning : '$borderColor'}
      backgroundColor={expiring ? `${semantic.warning}1F` : '$surface'}
    >
      <Text fontSize={14.5} fontWeight="600" color="$color" numberOfLines={1}>
        {draft.pod_title || t('mweb.hostManage.untitledPod')}
      </Text>
      <Text fontSize={12} color="$muted">
        Step {step + 1}/{STEP_TITLES.length} · {STEP_TITLES[step]}
        {when ? ` · ${when}` : ''}
      </Text>
      {expiring ? (
        <XStack gap={6} alignItems="center">
          <MaterialIcons name="schedule" size={14} color={semantic.warning} />
          <Text fontSize={12} fontWeight="700" color={semantic.warning}>
            {countdown}
          </Text>
        </XStack>
      ) : null}
      <XStack gap={10} alignItems="center">
        <XStack
          testID={`draft-continue-${draft.id}`}
          role="button"
          aria-label={t('mweb.hostManage.continueDraft')}
          onPress={() => onContinue(draft.id)}
          flex={1}
          height={42}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          backgroundColor={expiring ? semantic.warning : '$primary'}
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={13} fontWeight="700" color="$onPrimary">
            {t('mweb.common.continue')}
          </Text>
        </XStack>
        <XStack
          testID={`draft-delete-${draft.id}`}
          role="button"
          aria-label={t('mweb.common.deleteDraft2')}
          onPress={() => onDelete(draft.id)}
          width={42}
          height={42}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="delete-outline" size={20} color={danger} />
        </XStack>
      </XStack>
    </YStack>
  );
}
