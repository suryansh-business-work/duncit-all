import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { AdminCategoryValue, CategoryDoc } from '../src/types';
import { EMPTY_CATEGORY } from '../src/types';
import type { AdminCategorySelectProps } from '../src/AdminCategorySelect';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

const { AdminCategorySelect } = await import('../src/AdminCategorySelect');

const CATEGORIES: CategoryDoc[] = [
  { id: 's1', name: 'Arts', slug: 'arts', level: 'SUPER' },
  { id: 's2', name: 'Wellness', slug: 'wellness', level: 'SUPER' },
  { id: 'c1', name: 'Painting', slug: 'painting', level: 'CATEGORY', parent_id: 's1' },
  { id: 'c2', name: 'Dance', slug: 'dance', level: 'CATEGORY', parent_id: 's1' },
  { id: 'c3', name: 'Yoga', slug: 'yoga', level: 'CATEGORY', parent_id: 's2' },
  { id: 'sub1', name: 'Watercolor', slug: 'watercolor', level: 'SUB', parent_id: 'c1' },
  { id: 'sub2', name: 'Oil', slug: 'oil', level: 'SUB', parent_id: 'c1' },
  { id: 'sub3', name: 'Hatha', slug: 'hatha', level: 'SUB', parent_id: 'c3' },
];

const FULL_VALUE: AdminCategoryValue = {
  super_id: 's1',
  super_name: 'Arts',
  category_id: 'c1',
  category_name: 'Painting',
  sub_id: 'sub1',
  sub_name: 'Watercolor',
};

function setCategories(categories: CategoryDoc[], loading = false) {
  useQueryMock.mockReturnValue({ data: { categories }, loading, error: undefined });
}

interface WrapperProps extends Omit<AdminCategorySelectProps, 'value' | 'onChange'> {
  initialValue?: AdminCategoryValue;
  onChangeSpy?: (value: AdminCategoryValue) => void;
}

/** Controlled test harness — the picker itself never owns state. */
function Wrapper({ initialValue = EMPTY_CATEGORY, onChangeSpy, ...rest }: Readonly<WrapperProps>) {
  const [value, setValue] = useState(initialValue);
  const handleChange = (next: AdminCategoryValue) => {
    setValue(next);
    onChangeSpy?.(next);
  };
  return <AdminCategorySelect value={value} onChange={handleChange} {...rest} />;
}

function openDropdown(combo: HTMLElement) {
  fireEvent.mouseDown(combo);
}

function clearField(labelName: RegExp) {
  const combo = screen.getByRole('combobox', { name: labelName });
  const root = combo.closest('.MuiAutocomplete-root') as HTMLElement;
  fireEvent.click(within(root).getByLabelText(/clear/i));
}

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('AdminCategorySelect', () => {
  it('renders default labels for all three levels', () => {
    setCategories(CATEGORIES);
    render(<Wrapper />);
    expect(screen.getByRole('combobox', { name: /Super Category/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Category/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Sub Category/i })).toBeInTheDocument();
  });

  it('disables category and sub until a super is chosen', () => {
    setCategories(CATEGORIES);
    render(<Wrapper />);
    expect(screen.getByRole('combobox', { name: /Super Category/i })).toBeEnabled();
    expect(screen.getByRole('combobox', { name: /^Category/i })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /Sub Category/i })).toBeDisabled();
  });

  it('disables every field, including super, when disabled is set', () => {
    setCategories(CATEGORIES);
    render(<Wrapper disabled />);
    expect(screen.getByRole('combobox', { name: /Super Category/i })).toBeDisabled();
  });

  it('shows "No options" while the category tree is empty', async () => {
    setCategories([], false);
    render(<Wrapper />);
    openDropdown(screen.getByRole('combobox', { name: /Super Category/i }));
    expect(await screen.findByText(/no options/i)).toBeInTheDocument();
  });

  it('selecting a super resets category/sub and populates the category options', () => {
    setCategories(CATEGORIES);
    const onChangeSpy = vi.fn();
    render(<Wrapper initialValue={FULL_VALUE} onChangeSpy={onChangeSpy} />);

    openDropdown(screen.getByRole('combobox', { name: /Super Category/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Wellness' }));

    expect(onChangeSpy).toHaveBeenCalledWith({
      ...EMPTY_CATEGORY,
      super_id: 's2',
      super_name: 'Wellness',
    });

    openDropdown(screen.getByRole('combobox', { name: /^Category/i }));
    expect(screen.getByRole('option', { name: 'Yoga' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Painting' })).not.toBeInTheDocument();
  });

  it('selecting a category resets the sub selection', () => {
    setCategories(CATEGORIES);
    const onChangeSpy = vi.fn();
    render(<Wrapper initialValue={FULL_VALUE} onChangeSpy={onChangeSpy} />);

    openDropdown(screen.getByRole('combobox', { name: /^Category/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Dance' }));

    expect(onChangeSpy).toHaveBeenCalledWith({
      ...FULL_VALUE,
      category_id: 'c2',
      category_name: 'Dance',
      sub_id: '',
      sub_name: '',
    });
  });

  it('selecting a sub directly derives the category from the sub\'s parent', () => {
    setCategories(CATEGORIES);
    const onChangeSpy = vi.fn();
    const startValue: AdminCategoryValue = {
      ...EMPTY_CATEGORY,
      super_id: 's1',
      super_name: 'Arts',
    };
    render(<Wrapper initialValue={startValue} onChangeSpy={onChangeSpy} />);

    openDropdown(screen.getByRole('combobox', { name: /Sub Category/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Oil' }));

    expect(onChangeSpy).toHaveBeenCalledWith({
      super_id: 's1',
      super_name: 'Arts',
      category_id: 'c1',
      category_name: 'Painting',
      sub_id: 'sub2',
      sub_name: 'Oil',
    });
  });

  it('clearing the super resets the entire value', () => {
    setCategories(CATEGORIES);
    const onChangeSpy = vi.fn();
    render(<Wrapper initialValue={FULL_VALUE} onChangeSpy={onChangeSpy} />);

    clearField(/Super Category/i);

    expect(onChangeSpy).toHaveBeenCalledWith(EMPTY_CATEGORY);
  });

  it('clearing the category also clears the sub but keeps the super', () => {
    setCategories(CATEGORIES);
    const onChangeSpy = vi.fn();
    render(<Wrapper initialValue={FULL_VALUE} onChangeSpy={onChangeSpy} />);

    clearField(/^Category/i);

    expect(onChangeSpy).toHaveBeenCalledWith({
      ...FULL_VALUE,
      category_id: '',
      category_name: '',
      sub_id: '',
      sub_name: '',
    });
  });

  it('clearing the sub falls back to the already-selected category', () => {
    setCategories(CATEGORIES);
    const onChangeSpy = vi.fn();
    render(<Wrapper initialValue={FULL_VALUE} onChangeSpy={onChangeSpy} />);

    clearField(/Sub Category/i);

    expect(onChangeSpy).toHaveBeenCalledWith({
      ...FULL_VALUE,
      sub_id: '',
      sub_name: '',
    });
  });

  it('clearing the sub with no category ever chosen leaves the category empty', () => {
    setCategories(CATEGORIES);
    const onChangeSpy = vi.fn();
    const startValue: AdminCategoryValue = {
      super_id: 's1',
      super_name: 'Arts',
      category_id: '',
      category_name: '',
      sub_id: 'sub1',
      sub_name: 'Watercolor',
    };
    render(<Wrapper initialValue={startValue} onChangeSpy={onChangeSpy} />);

    clearField(/Sub Category/i);

    expect(onChangeSpy).toHaveBeenCalledWith({
      super_id: 's1',
      super_name: 'Arts',
      category_id: '',
      category_name: '',
      sub_id: '',
      sub_name: '',
    });
  });

  it('resolves a dangling category reference to an empty name when clearing an orphaned sub', () => {
    const orphanCategories: CategoryDoc[] = [
      { id: 's1', name: 'Arts', slug: 'arts', level: 'SUPER' },
      { id: 'sub-orphan', name: 'Orphan Sub', slug: 'orphan-sub', level: 'SUB', parent_id: 'ghost-cat' },
    ];
    setCategories(orphanCategories);
    const onChangeSpy = vi.fn();
    const startValue: AdminCategoryValue = {
      super_id: 's1',
      super_name: 'Arts',
      category_id: 'ghost-cat',
      category_name: 'Ghost',
      sub_id: 'sub-orphan',
      sub_name: 'Orphan Sub',
    };
    render(<Wrapper initialValue={startValue} onChangeSpy={onChangeSpy} />);

    clearField(/Sub Category/i);

    expect(onChangeSpy).toHaveBeenCalledWith({
      super_id: 's1',
      super_name: 'Arts',
      category_id: 'ghost-cat',
      category_name: '',
      sub_id: '',
      sub_name: '',
    });
  });

  it('renders only the requested fields', () => {
    setCategories(CATEGORIES);
    render(<Wrapper fields={['super']} />);
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: /Super Category/i })).toBeInTheDocument();
  });

  it('shows custom labels, required marker and per-level error text', () => {
    setCategories(CATEGORIES);
    render(
      <Wrapper
        required
        labels={{ super: 'Vertical' }}
        errors={{ sub: 'Pick a sub category' }}
      />,
    );
    expect(screen.getByRole('combobox', { name: /Vertical/i })).toBeInTheDocument();
    expect(screen.getByText('Pick a sub category')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Super Category|Vertical/i })).toBeRequired();
  });

  it('wraps the fields in a titled fieldset with a hint when legend is given', () => {
    setCategories(CATEGORIES);
    const { container } = render(<Wrapper legend="Pick a category" hint="Used for search filters" />);
    expect(screen.getByText('Pick a category')).toBeInTheDocument();
    expect(screen.getByText('Used for search filters')).toBeInTheDocument();
    // 3 outlined TextFields each render their own <fieldset>; the wrapper adds one more.
    expect(container.querySelectorAll('fieldset').length).toBe(4);
  });

  it('renders the fields directly, without a wrapping fieldset, when no legend is given', () => {
    setCategories(CATEGORIES);
    const { container } = render(<Wrapper />);
    expect(container.querySelectorAll('fieldset').length).toBe(3);
  });
});
