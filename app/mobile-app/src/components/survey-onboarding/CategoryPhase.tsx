import { useEffect, useState } from 'react';
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
export function CategoryPhase({ busy, error, onContinue }: Readonly<Props>) {
  const { color: ink, primary } = useThemeColors();
  const [scope, setScope] = useState<Scope>({
    super_category_id: '',
    category_id: '',
    sub_category_id: '',
  });
  const supers = useCategories('SUPER', '', true);
  const cats = useCategories('CATEGORY', scope.super_category_id, !!scope.super_category_id);
  const subs = useCategories('SUB', scope.category_id, !!scope.category_id);

  const pick = (level: keyof Scope, id: string) => {
    if (level === 'super_category_id')
      setScope({ super_category_id: id, category_id: '', sub_category_id: '' });
    else if (level === 'category_id')
      setScope((s) => ({ ...s, category_id: id, sub_category_id: '' }));
    else setScope((s) => ({ ...s, sub_category_id: id }));
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
            return (
              <Button
                key={c.id}
                testID={`cat-${c.id}`}
                size="$3"
                borderRadius={999}
                backgroundColor={selected ? primary : 'transparent'}
                borderColor={selected ? primary : ink}
                borderWidth={1}
                onPress={() => pick(level, c.id)}
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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      {group('Super category *', 'super_category_id', supers)}
      {group('Category', 'category_id', cats)}
      {group('Sub category', 'sub_category_id', subs)}
      {error ? <Text color="$red10">{error}</Text> : null}
      <Button
        testID="primary-action"
        disabled={busy || !scope.super_category_id}
        opacity={!scope.super_category_id ? 0.5 : 1}
        onPress={() => onContinue(scope)}
        backgroundColor={primary}
        color="white"
        fontWeight="800"
      >
        {busy ? 'Loading…' : 'Continue'}
      </Button>
    </ScrollView>
  );
}
