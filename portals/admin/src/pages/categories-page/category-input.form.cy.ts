import { describe, expect, it } from 'vitest';
import { buildCreateInput, buildMediaFromText, buildUpdateInput } from './helpers';
import { blankForm, CategoryIconLayout, FormState } from './queries';

const media = buildMediaFromText('');

const layout: CategoryIconLayout = { position: 'LEFT', width: 50, height: 60 };

const categoryForm: FormState = {
  ...blankForm,
  name: 'Fitness',
  icon_layout_mweb: layout,
  icon_layout_native: null,
};

describe('icon layout in category mutation input (CATEGORY only)', () => {
  it('includes a configured surface as { position, width, height } on create', () => {
    const input = buildCreateInput(categoryForm, 'CATEGORY', 'parent-1', media);
    expect(input).toMatchObject({ icon_layout_mweb: { position: 'LEFT', width: 50, height: 60 } });
  });

  it('omits a surface whose layout is null', () => {
    const input = buildCreateInput(categoryForm, 'CATEGORY', 'parent-1', media);
    expect(input).not.toHaveProperty('icon_layout_native');
  });

  it('includes the layout on update as well', () => {
    const input = buildUpdateInput(categoryForm, media, 'CATEGORY');
    expect(input).toMatchObject({ icon_layout_mweb: { position: 'LEFT', width: 50, height: 60 } });
  });

  it('strips any Apollo __typename before sending it to the server', () => {
    const withTypename = {
      ...categoryForm,
      icon_layout_mweb: { __typename: 'CategoryIconLayout', ...layout },
    } as FormState;
    const input = buildCreateInput(withTypename, 'CATEGORY', 'parent-1', media);
    expect(input).toMatchObject({ icon_layout_mweb: layout });
    expect(input.icon_layout_mweb).not.toHaveProperty('__typename');
  });

  it('never carries icon layout on SUPER or SUB', () => {
    expect(buildCreateInput(categoryForm, 'SUPER', null, media)).not.toHaveProperty(
      'icon_layout_mweb'
    );
    expect(buildUpdateInput(categoryForm, media, 'SUB')).not.toHaveProperty('icon_layout_mweb');
    expect(buildUpdateInput(categoryForm, media)).not.toHaveProperty('icon_layout_mweb');
  });
});
