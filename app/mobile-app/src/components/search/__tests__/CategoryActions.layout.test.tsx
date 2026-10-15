import { screen } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';

import { CategoryActions } from '@/components/search/CategoryActions';
import { CategoryLevel } from '@/generated/graphql/graphql';
import type { SearchCategory } from '@/hooks/useSearch';
import { renderWithProviders } from '@/utils/test-utils';

const category = (over: Partial<SearchCategory>) =>
  ({
    id: 'c1',
    name: 'Sports',
    slug: 'sports',
    icon: null,
    level: 'CATEGORY',
    parent_id: null,
    ...over,
  }) as unknown as SearchCategory;

const ART_IMAGE = 'https://ik.imagekit.io/duncit/art.png';

/** The nearest rendered (host) ancestor — the soft circle around a mark. */
const hostParentOf = (element: ReactTestInstance) => {
  let node = element.parent;
  while (node && typeof node.type !== 'string') node = node.parent;
  if (!node) throw new Error('no host parent');
  return node;
};

/*
  An admin's category image has to read at a glance, so the tile's mark fills
  most of its soft circle: a 44px mark in a 64px circle that clips whatever
  pokes past its round edge. The super-category heading keeps its small mark.
*/
describe('CategoryActions — tile marks', () => {
  const renderTiles = () =>
    renderWithProviders(
      <CategoryActions
        groups={[
          {
            superCategory: category({
              id: 's1',
              name: 'Calm',
              level: CategoryLevel.Super,
              icon: '⚡',
            }),
            categories: [
              category({ id: 'c4', name: 'Art', icon: ART_IMAGE, parent_id: 's1' }),
              category({ id: 'c1', name: 'Sports', icon: '🏸', parent_id: 's1' }),
            ],
          },
        ]}
        onSelect={jest.fn()}
      />,
    );

  it("draws the admin's image at 44px inside a clipped 64px circle", () => {
    renderTiles();
    const image = screen.getByTestId('search-cat-c4-image');
    expect(image).toHaveStyle({ width: 44, height: 44 });
    expect(hostParentOf(image)).toHaveStyle({ width: 64, height: 64, overflow: 'hidden' });
  });

  it('sizes an emoji mark to the same 44px, and leaves the heading mark small', () => {
    renderTiles();
    expect(screen.getByText('🏸')).toHaveStyle({ fontSize: 44 });
    expect(screen.getByText('⚡')).toHaveStyle({ fontSize: 18 });
  });
});
