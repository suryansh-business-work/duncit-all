import { Text, XStack, YStack } from 'tamagui';

import { useCategoryLevel } from '@/hooks/useCategoryLevel';
import { useThemeColors } from '@/hooks/useThemeColors';
import { type CategoryOption } from '@/graphql/onboarding-survey';

export interface CategoryScope {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}
export interface CategoryLabels {
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
}
export const EMPTY_CATEGORY_SCOPE: CategoryScope = {
  super_category_id: '',
  category_id: '',
  sub_category_id: '',
};

interface Props {
  value: CategoryScope;
  onChange: (scope: CategoryScope, labels: CategoryLabels) => void;
  /** Filter mode: each level offers an "All" chip that clears it (and children). */
  allowAll?: boolean;
  /** Disambiguates testIDs when a composer and a filter render on one screen. */
  idPrefix?: string;
}

const nameOf = (opts: CategoryOption[], id: string) => opts.find((o) => o.id === id)?.name ?? '';

/**
 * Cascading Super → Category → Sub category picker shared by the pod-idea
 * composer (mandatory hierarchy) and the list filter (`allowAll` clears a
 * level). Controlled: emits the full id scope + resolved names on every change.
 */
export function CategoryCascadeField({
  value,
  onChange,
  allowAll = false,
  idPrefix = 'idea-cat',
}: Readonly<Props>) {
  const { color: ink, primary, onPrimary } = useThemeColors();
  const supers = useCategoryLevel('SUPER', '', true);
  const cats = useCategoryLevel('CATEGORY', value.super_category_id, !!value.super_category_id);
  const subs = useCategoryLevel('SUB', value.category_id, !!value.category_id);

  const emit = (scope: CategoryScope) =>
    onChange(scope, {
      super_category_name: nameOf(supers, scope.super_category_id),
      category_name: nameOf(cats, scope.category_id),
      sub_category_name: nameOf(subs, scope.sub_category_id),
    });

  const pick = (level: keyof CategoryScope, id: string) => {
    if (level === 'super_category_id')
      emit({ super_category_id: id, category_id: '', sub_category_id: '' });
    else if (level === 'category_id') emit({ ...value, category_id: id, sub_category_id: '' });
    else emit({ ...value, sub_category_id: id });
  };

  const chip = (level: keyof CategoryScope, id: string, label: string) => {
    const selected = value[level] === id;
    return (
      <XStack
        key={`${level}-${id || 'all'}`}
        testID={`${idPrefix}-${level}-${id || 'all'}`}
        role="button"
        aria-label={label}
        onPress={() => pick(level, id)}
        paddingHorizontal={12}
        height={32}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor={selected ? primary : '$borderColor'}
        backgroundColor={selected ? primary : 'transparent'}
        pressStyle={{ opacity: 0.7 }}
      >
        <Text
          fontSize={12.5}
          fontWeight={selected ? '800' : '600'}
          color={selected ? onPrimary : ink}
        >
          {label}
        </Text>
      </XStack>
    );
  };

  const group = (label: string, level: keyof CategoryScope, options: CategoryOption[]) =>
    options.length === 0 ? null : (
      <YStack gap={6}>
        <Text fontSize={12.5} fontWeight="800" color="$muted">
          {label}
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {allowAll ? chip(level, '', 'All') : null}
          {options.map((c) => chip(level, c.id, c.name))}
        </XStack>
      </YStack>
    );

  const superLabel = allowAll ? 'Super Category' : 'Super Category *';
  const categoryLabel = allowAll ? 'Category' : 'Category *';
  const subLabel = allowAll ? 'Sub Category' : 'Sub Category *';

  return (
    <YStack gap={12} testID={`${idPrefix}-cascade`}>
      {group(superLabel, 'super_category_id', supers)}
      {group(categoryLabel, 'category_id', cats)}
      {group(subLabel, 'sub_category_id', subs)}
    </YStack>
  );
}
