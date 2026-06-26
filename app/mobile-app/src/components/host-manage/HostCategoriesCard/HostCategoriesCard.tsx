import { useEffect, useState } from 'react';
import { Text, YStack } from 'tamagui';

import { MyHostCategoriesDocument } from '@/graphql/host-request';
import { graphqlRequest } from '@/services/graphql.client';

interface HostCategory {
  super_category_name: string;
  category_name: string;
  sub_category_name: string;
}

/** "Super › Category › Sub" — drops empty parts; separator " › " (kept in sync with mWeb). */
function formatCategoryPath(cat: HostCategory): string {
  return [cat.super_category_name, cat.category_name, cat.sub_category_name]
    .filter(Boolean)
    .join(' › ');
}

/**
 * Host Studio section listing the categories this host is approved to operate in.
 * Renders null when the host holds none (or the query fails).
 */
export function HostCategoriesCard() {
  const [categories, setCategories] = useState<HostCategory[]>([]);

  useEffect(() => {
    let alive = true;
    graphqlRequest(MyHostCategoriesDocument, undefined, { auth: true })
      .then((res) => alive && setCategories(res.myHost?.host_categories ?? []))
      .catch(() => alive && setCategories([]));
    return () => {
      alive = false;
    };
  }, []);

  if (categories.length === 0) return null;

  return (
    <YStack
      testID="host-categories-card"
      gap={8}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={16} fontWeight="900" color="$color">
        Your hosting categories
      </Text>
      {categories.map((cat) => {
        const path = formatCategoryPath(cat);
        return (
          <Text key={path} testID="host-category-row" fontSize={13} color="$muted">
            {path}
          </Text>
        );
      })}
    </YStack>
  );
}
