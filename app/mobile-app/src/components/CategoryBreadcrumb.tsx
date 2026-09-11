import { Text } from 'tamagui';

interface Props {
  /** Root-first category names, e.g. ['Sports', 'Racquet', 'Badminton']. */
  crumbs: readonly string[];
}

/**
 * Super › Category › Sub category breadcrumb on one line: the path muted, the
 * leaf (last) crumb in ink — mWeb's CategoryBreadcrumb emphasises it the same
 * way. Renders nothing when there are no crumbs.
 */
export function CategoryBreadcrumb({ crumbs }: Readonly<Props>) {
  if (crumbs.length === 0) return null;
  const leaf = crumbs.at(-1);
  const path = crumbs.slice(0, -1);
  return (
    <Text
      testID="category-breadcrumb"
      fontSize={13}
      fontWeight="500"
      color="$muted"
      numberOfLines={1}
    >
      {path.map((name) => `${name} › `).join('')}
      <Text fontWeight="600" color="$color">
        {leaf}
      </Text>
    </Text>
  );
}
