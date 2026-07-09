import { Text } from 'tamagui';

interface Props {
  /** Root-first category names, e.g. ['Sports', 'Racquet', 'Badminton']. */
  crumbs: readonly string[];
}

/**
 * Super › Category › Sub category breadcrumb rendered as a single muted line.
 * Renders nothing when there are no crumbs.
 */
export function CategoryBreadcrumb({ crumbs }: Readonly<Props>) {
  if (crumbs.length === 0) return null;
  return (
    <Text testID="category-breadcrumb" fontSize={12.5} color="$muted" numberOfLines={1}>
      {crumbs.join(' › ')}
    </Text>
  );
}
