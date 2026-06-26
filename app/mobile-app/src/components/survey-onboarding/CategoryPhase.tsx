import { useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { graphqlRequest } from '@/services/graphql.client';
import {
  CategoriesDocument,
  type CategoriesResult,
  type CategoryLevel,
  type CategoryOption,
} from '@/graphql/onboarding-survey';
import type { Scope } from './useOnboardingFlow';

interface Props {
  busy: boolean;
  error: string | null;
  onContinue: (scope: Scope) => void;
  /** Leaf category ids the host already holds/has pending — rendered non-pressable. */
  disabledIds?: string[];
}

function useCategories(level: CategoryLevel, parentId: string, enabled: boolean) {
  const [options, setOptions] = useState<CategoryOption[]>([]);
  useEffect(() => {
    if (!enabled) {
      setOptions([]);
      return;
    }
    let alive = true;
    graphqlRequest<CategoriesResult, { level: CategoryLevel; parent_id: string | null }>(
      CategoriesDocument,
      { level, parent_id: level === 'SUPER' ? null : parentId },
      { auth: true },
    )
      .then((r) => {
        if (!alive) return;
        setOptions(
          (r.categories ?? [])
            .filter((c) => c.is_active !== false)
            .sort(
              (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
            ),
        );
      })
      .catch(() => alive && setOptions([]));
    return () => {
      alive = false;
    };
  }, [level, parentId, enabled]);
  return options;
}

/** Super → Category → Sub picker; resolves which survey to ask. */
export function CategoryPhase({ busy, error, onContinue, disabledIds }: Readonly<Props>) {
  const { color: ink, primary } = useThemeColors();
  const disabledSet = useMemo(() => new Set(disabledIds ?? []), [disabledIds]);
  const [scope, setScope] = useState<Scope>({
    super_category_id: '',
    category_id: '',
    sub_category_id: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const supers = useCategories('SUPER', '', true);
  const cats = useCategories('CATEGORY', scope.super_category_id, !!scope.super_category_id);
  const subs = useCategories('SUB', scope.category_id, !!scope.category_id);

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

  const onContinuePress = () => {
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }
    setValidationError(null);
    onContinue(scope);
  };

  const group = (label: string, level: keyof Scope, options: CategoryOption[]) =>
    options.length === 0 ? null : (
      <YStack gap={8}>
        <Text fontSize={14} fontWeight="700" color={ink}>
          {label}
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {options.map((c) => {
            const selected = scope[level] === c.id;
            const heldDisabled = disabledSet.has(c.id);
            return (
              <Button
                key={c.id}
                testID={`cat-${c.id}`}
                size="$3"
                borderRadius={999}
                backgroundColor={selected ? primary : 'transparent'}
                borderColor={selected ? primary : ink}
                borderWidth={1}
                disabled={heldDisabled}
                aria-disabled={heldDisabled}
                opacity={heldDisabled ? 0.4 : 1}
                onPress={heldDisabled ? undefined : () => pick(level, c.id)}
              >
                <Text color={selected ? 'white' : ink} fontWeight={selected ? '800' : '500'}>
                  {c.name}
                </Text>
              </Button>
            );
          })}
        </XStack>
      </YStack>
    );

  const message = validationError || error;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {group('Super Category *', 'super_category_id', supers)}
      {group('Category *', 'category_id', cats)}
      {group('Sub-Category *', 'sub_category_id', subs)}
      {message ? (
        <Text testID="category-error" color="$red10">
          {message}
        </Text>
      ) : null}
      <Button
        testID="primary-action"
        disabled={busy}
        onPress={onContinuePress}
        backgroundColor={primary}
        color="white"
        fontWeight="800"
      >
        {busy ? 'Loading…' : 'Continue'}
      </Button>
    </ScrollView>
  );
}
