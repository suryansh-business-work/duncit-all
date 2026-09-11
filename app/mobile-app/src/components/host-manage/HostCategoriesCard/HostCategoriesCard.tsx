import { useEffect, useState } from 'react';
import { Text, XStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
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
 * Host Studio card listing the categories this host is approved to operate in,
 * as soft pills. Renders null when the host holds none (or the query fails).
 * mWeb twin: host-apply-page/HostCategoriesCard.
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
    <SurfaceCard testID="host-categories-card" gap={12}>
      <Text fontSize={16} fontWeight="600" color="$color">
        Your hosting categories
      </Text>
      <XStack flexWrap="wrap" gap={8}>
        {categories.map((cat) => {
          const path = formatCategoryPath(cat);
          return (
            <XStack
              key={path}
              maxWidth="100%"
              height={32}
              paddingHorizontal={12}
              alignItems="center"
              borderRadius={999}
              backgroundColor="$soft"
            >
              <Text
                testID="host-category-row"
                fontSize={13}
                fontWeight="600"
                color="$color"
                numberOfLines={1}
              >
                {path}
              </Text>
            </XStack>
          );
        })}
      </XStack>
    </SurfaceCard>
  );
}
