import { categoryPathLabel, ideaMatchesScope } from '@/utils/idea-category';

const scope = (
  over: Partial<Record<'super_category_id' | 'category_id' | 'sub_category_id', string>> = {},
) => ({
  super_category_id: '',
  category_id: '',
  sub_category_id: '',
  ...over,
});

const idea = {
  super_category_id: 's1',
  category_id: 'c1',
  sub_category_id: 'b1',
};

describe('ideaMatchesScope', () => {
  it('matches everything when the scope is empty', () => {
    expect(ideaMatchesScope(idea, scope())).toBe(true);
  });

  it('matches on the deepest selected level (sub wins)', () => {
    expect(ideaMatchesScope(idea, scope({ super_category_id: 's1', sub_category_id: 'b1' }))).toBe(
      true,
    );
    expect(ideaMatchesScope(idea, scope({ sub_category_id: 'other' }))).toBe(false);
  });

  it('falls back to category then super when no deeper level is chosen', () => {
    expect(ideaMatchesScope(idea, scope({ category_id: 'c1' }))).toBe(true);
    expect(ideaMatchesScope(idea, scope({ category_id: 'nope' }))).toBe(false);
    expect(ideaMatchesScope(idea, scope({ super_category_id: 's1' }))).toBe(true);
    expect(ideaMatchesScope(idea, scope({ super_category_id: 'nope' }))).toBe(false);
  });

  it('treats missing idea category ids as non-matching', () => {
    expect(ideaMatchesScope({}, scope({ super_category_id: 's1' }))).toBe(false);
  });
});

describe('categoryPathLabel', () => {
  it('joins the named levels with a chevron', () => {
    expect(
      categoryPathLabel({
        super_category_name: 'For You',
        category_name: 'Sports',
        sub_category_name: 'Badminton',
      }),
    ).toBe('For You › Sports › Badminton');
  });

  it('skips blank or missing levels', () => {
    expect(
      categoryPathLabel({
        super_category_name: 'For You',
        category_name: '  ',
        sub_category_name: null,
      }),
    ).toBe('For You');
    expect(categoryPathLabel({})).toBe('');
  });
});
