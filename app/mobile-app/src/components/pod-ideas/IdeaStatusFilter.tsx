import { useTranslation } from '@/hooks/useTranslation';
import { Text, XStack, YStack } from 'tamagui';
import type { Translate } from '@/i18n/fallback';

/** The moderation states an idea can sit in, plus the unfiltered default. */
export type IdeaStatusFilterValue = 'ALL' | 'APPROVED' | 'REJECTED' | 'PENDING';

const options = (t: Translate): readonly { value: IdeaStatusFilterValue; label: string }[] => [
  { value: 'ALL', label: t('mweb.common.all') },
  { value: 'APPROVED', label: t('mweb.common.approved') },
  { value: 'REJECTED', label: t('mweb.podIdeas.rejected') },
  { value: 'PENDING', label: t('mweb.common.pending') },
];

interface Props {
  value: IdeaStatusFilterValue;
  onChange: (next: IdeaStatusFilterValue) => void;
}

/**
 * Moderation-state filter for the ideas list.
 *
 * Only the submitter's own ideas carry a visible state — the public feed is
 * approved by definition — so this filters "Your submissions". It sits under
 * the category cascade because it narrows the same list, and reads as one more
 * chip row rather than a different kind of control.
 */
export function IdeaStatusFilter({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={6} testID="idea-status-filter">
      <Text fontSize={12.5} fontWeight="600" color="$muted">
        Status
      </Text>
      <XStack flexWrap="wrap" gap={8}>
        {options(t).map((option) => {
          const selected = value === option.value;
          return (
            <XStack
              key={option.value}
              testID={`idea-status-${option.value}`}
              role="button"
              aria-label={option.label}
              aria-pressed={selected}
              onPress={() => onChange(option.value)}
              paddingHorizontal={12}
              paddingVertical={7}
              borderRadius={999}
              borderWidth={1}
              borderColor={selected ? '$primary' : '$borderColor'}
              backgroundColor={selected ? '$primary' : 'transparent'}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={12.5} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
                {option.label}
              </Text>
            </XStack>
          );
        })}
      </XStack>
    </YStack>
  );
}

/** Does this idea sit in the chosen state? PENDING is "not yet decided", which
 * covers rows the server has left unset as well as an explicit PENDING. */
export function ideaMatchesStatus(idea: { status?: string | null }, filter: IdeaStatusFilterValue) {
  if (filter === 'ALL') return true;
  const status = (idea.status ?? 'PENDING').toUpperCase();
  if (filter === 'PENDING') return status !== 'APPROVED' && status !== 'REJECTED';
  return status === filter;
}
