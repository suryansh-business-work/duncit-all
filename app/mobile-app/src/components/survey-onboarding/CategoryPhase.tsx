import { useMemo, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitButton } from '@/components/DuncitButton';
import { useBottomInset } from '@/hooks/useBottomNavSpace';
import { useCategoryLevel } from '@/hooks/useCategoryLevel';
import { type CategoryOption } from '@/graphql/onboarding-survey';
import type { CategoryLabels, Scope } from './useOnboardingFlow';
import { RefreshScrollView } from '@/components/PullToRefresh';

const EMPTY_SCOPE: Scope = { super_category_id: '', category_id: '', sub_category_id: '' };

interface Props {
  busy: boolean;
  error: string | null;
  onContinue: (scope: Scope, labels: CategoryLabels) => void;
  /** Leaf category ids the host already holds/has pending — rendered non-pressable. */
  disabledIds?: string[];
  /** Prior selection to seed the picker with when re-entered to edit. */
  initialScope?: Scope;
}

/** Super → Category → Sub picker; resolves which survey to ask. */
export function CategoryPhase({
  busy,
  error,
  onContinue,
  disabledIds,
  initialScope,
}: Readonly<Props>) {
  // Same as the other phases: the Continue button is the last row of the scroll
  // and the edge-to-edge window paints the Android navigation bar over it.
  const bottomInset = useBottomInset();
  const disabledSet = useMemo(() => new Set(disabledIds ?? []), [disabledIds]);
  const [scope, setScope] = useState<Scope>(initialScope ?? EMPTY_SCOPE);
  const [validationError, setValidationError] = useState<string | null>(null);
  const supers = useCategoryLevel('SUPER', '', true);
  const cats = useCategoryLevel('CATEGORY', scope.super_category_id, !!scope.super_category_id);
  const subs = useCategoryLevel('SUB', scope.category_id, !!scope.category_id);

  const pick = (level: keyof Scope, id: string) => {
    setValidationError(null);
    if (level === 'super_category_id')
      setScope({ super_category_id: id, category_id: '', sub_category_id: '' });
    else if (level === 'category_id')
      setScope((s) => ({ ...s, category_id: id, sub_category_id: '' }));
    else setScope((s) => ({ ...s, sub_category_id: id }));
  };

  // Category / Sub-category are required only when that level offers choices.
  const validationMessage = useMemo(() => {
    if (!scope.super_category_id) return 'Please select a Super Category.';
    if (cats.length > 0 && !scope.category_id) return 'Please select a Category.';
    if (subs.length > 0 && !scope.sub_category_id) return 'Please select a Sub-Category.';
    return null;
  }, [scope, cats.length, subs.length]);

  const nameOf = (options: CategoryOption[], id: string) =>
    options.find((o) => o.id === id)?.name ?? '';

  const onContinuePress = () => {
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }
    setValidationError(null);
    onContinue(scope, {
      super: nameOf(supers, scope.super_category_id),
      category: nameOf(cats, scope.category_id),
      sub: nameOf(subs, scope.sub_category_id),
    });
  };

  // Calm pills: surface when idle, green with white text when picked.
  const group = (label: string, level: keyof Scope, options: CategoryOption[]) =>
    options.length === 0 ? null : (
      <YStack gap={8}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {label}
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {options.map((c) => {
            const selected = scope[level] === c.id;
            const heldDisabled = disabledSet.has(c.id);
            return (
              <XStack
                key={c.id}
                testID={`cat-${c.id}`}
                role="button"
                aria-label={c.name}
                aria-pressed={selected}
                aria-disabled={heldDisabled}
                disabled={heldDisabled}
                height={40}
                paddingHorizontal={16}
                alignItems="center"
                borderRadius={999}
                borderWidth={1}
                borderColor={selected ? '$primary' : '$borderColor'}
                backgroundColor={selected ? '$primary' : '$surface'}
                opacity={heldDisabled ? 0.4 : 1}
                pressStyle={PRESS_STYLE.control}
                onPress={heldDisabled ? undefined : () => pick(level, c.id)}
              >
                <Text fontSize={13} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
                  {c.name}
                </Text>
              </XStack>
            );
          })}
        </XStack>
      </YStack>
    );

  const message = validationError || error;
  return (
    <RefreshScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: bottomInset + 16, gap: 16 }}
    >
      {group('Super Category *', 'super_category_id', supers)}
      {group('Category *', 'category_id', cats)}
      {group('Sub-Category *', 'sub_category_id', subs)}
      {message ? (
        <Text testID="category-error" color="$danger">
          {message}
        </Text>
      ) : null}
      <DuncitButton
        testID="primary-action"
        label={busy ? 'Loading…' : 'Continue'}
        size="lg"
        fullWidth
        disabled={busy}
        onPress={onContinuePress}
      />
    </RefreshScrollView>
  );
}
