import { useEffect, useState } from 'react';
import { Text, YStack } from 'tamagui';
import type { AutoPodLabels } from '@duncit/utils';

import { OptionChipRow } from '@/components/home/HomeFilterParts';
import { MyHostCategoriesForAutoPodDocument } from '@/graphql/auto-pods';
import { graphqlRequest } from '@/services/graphql.client';

interface Props {
  /** The chosen sub-category id, or '' for all of the host's categories. */
  value: string;
  onChange: (subCategoryId: string) => void;
  labels: AutoPodLabels;
}

/** One chip: the sub-category id and its "Super › Category › Sub" path. */
type CategoryOption = readonly [string, string];

interface HostCategory {
  sub_category_id?: string | null;
  sub_category_name: string;
  category_name: string;
  super_category_name: string;
}

/** "Super › Category › Sub" — the same path the host-apply screens print. */
const pathOf = (row: HostCategory) =>
  [row.super_category_name, row.category_name, row.sub_category_name].filter(Boolean).join(' › ');

/**
 * The host queue's category filter: the sub-categories THIS host is approved
 * in, and nothing else — the server offers a host only those anyway, so the
 * list is the host's own approvals, not the whole tree. "All my categories"
 * is the first chip and the default.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `AutoPodCategoryFilter` (rule 27):
 * a chip rail over the same query, in place of the MUI select.
 */
export function AutoPodCategoryChips({ value, onChange, labels }: Readonly<Props>) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    graphqlRequest(MyHostCategoriesForAutoPodDocument, undefined, { auth: true })
      .then((res) => {
        if (!active) return;
        const rows = res.myHost?.host_categories ?? [];
        setCategories(
          rows
            .filter((row) => !!row.sub_category_id)
            .map((row) => [row.sub_category_id ?? '', pathOf(row)] as CategoryOption),
        );
      })
      .catch(() => undefined)
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  const options: CategoryOption[] = [['', labels.allCategories], ...categories];
  const none = loaded && categories.length === 0;

  return (
    <YStack testID="auto-pods-category-chips" gap={6}>
      <Text fontSize={11.5} fontWeight="600" color="$muted" textTransform="uppercase">
        {labels.categoryLabel}
      </Text>
      <OptionChipRow
        layout="scroll"
        testIDPrefix="auto-pods-category"
        options={options}
        value={value}
        onSelect={onChange}
      />
      {none ? (
        <Text testID="auto-pods-no-categories" fontSize={12} color="$muted">
          {labels.noHostCategories}
        </Text>
      ) : null}
    </YStack>
  );
}
