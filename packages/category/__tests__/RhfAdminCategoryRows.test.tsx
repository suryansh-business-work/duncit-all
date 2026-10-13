import { useEffect, type ReactNode } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { AdminCategoryRowsLabels, RhfAdminCategoryRowsProps } from '../src/RhfAdminCategoryRows';
import { EMPTY_CATEGORY, type AdminCategoryValue, type CategoryDoc } from '../src/types';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: useQueryMock,
}));

const { RhfAdminCategoryRows } = await import('../src/RhfAdminCategoryRows');

const CATEGORIES: CategoryDoc[] = [
  { id: 's1', name: 'Arts', slug: 'arts', level: 'SUPER' },
  { id: 'c1', name: 'Painting', slug: 'painting', level: 'CATEGORY', parent_id: 's1' },
  { id: 'u1', name: 'Watercolour', slug: 'watercolour', level: 'SUB', parent_id: 'c1' },
  { id: 'u2', name: 'Oils', slug: 'oils', level: 'SUB', parent_id: 'c1' },
];

const row = (subId: string, subName: string): AdminCategoryValue => ({
  super_id: 's1',
  super_name: 'Arts',
  category_id: 'c1',
  category_name: 'Painting',
  sub_id: subId,
  sub_name: subName,
});
const WATERCOLOUR = row('u1', 'Watercolour');
const OILS = row('u2', 'Oils');

const LABELS: AdminCategoryRowsLabels = {
  add: 'Add category',
  remove: (position) => `Remove category ${position}`,
  row: (position) => `Category ${position}`,
  primary: 'Primary',
  duplicate: 'Already added above',
  maxReached: 'That is the most categories allowed',
};

interface FormValues {
  categories: AdminCategoryValue[];
}
type Form = UseFormReturn<FormValues>;
type RowsProps = Omit<RhfAdminCategoryRowsProps<FormValues>, 'control' | 'name' | 'labels' | 'icons'>;

interface TestFormProps extends RowsProps {
  defaults?: AdminCategoryValue[];
  labels?: AdminCategoryRowsLabels;
  formRef?: { current: Form | null };
  /** Runs once the form is mounted — used to plant errors the way a resolver would. */
  onReady?: (form: Form) => void;
}

/** Hoisted so the rows are exercised through a real react-hook-form (S6478). */
function TestForm({ defaults, labels = LABELS, formRef, onReady, ...rows }: Readonly<TestFormProps>) {
  const form = useForm<FormValues>({ defaultValues: defaults ? { categories: defaults } : undefined });
  if (formRef) formRef.current = form;
  useEffect(() => {
    onReady?.(form);
    // Planted once, on mount: `form` is stable for the life of the test.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <RhfAdminCategoryRows
      control={form.control}
      name="categories"
      labels={labels}
      icons={{ add: <span data-testid="icon-add" />, remove: <span data-testid="icon-remove" /> }}
      {...rows}
    />
  );
}

const mount = (props: TestFormProps = {}) => {
  const formRef: { current: Form | null } = { current: null };
  render(<TestForm formRef={formRef} {...props} />);
  const form = () => {
    if (!formRef.current) throw new Error('form not mounted');
    return formRef.current;
  };
  return { form };
};

const removeButtons = () => screen.getAllByRole('button', { name: /^Remove category/ });
const addButton = () => screen.getByRole('button', { name: 'Add category' });
const combo = (rowIndex: number, name: RegExp) =>
  within(screen.getByTestId(`category-rows-row-${rowIndex}`)).getByRole('combobox', { name }) as HTMLInputElement;

beforeEach(() => {
  useQueryMock.mockReset();
  useQueryMock.mockReturnValue({ data: { categories: CATEGORIES }, loading: false, error: undefined });
});

describe('RhfAdminCategoryRows', () => {
  it('renders one named row per stored category, hydrated, with the first marked as primary', () => {
    mount({ defaults: [WATERCOLOUR, OILS] });

    expect(screen.getByRole('group', { name: 'Category 1' })).toBe(screen.getByTestId('category-rows-row-0'));
    expect(screen.getByRole('group', { name: 'Category 2' })).toBe(screen.getByTestId('category-rows-row-1'));
    expect(combo(0, /^Sub Category/).value).toBe('Watercolour');
    expect(combo(1, /^Sub Category/).value).toBe('Oils');
    const primary = screen.getAllByTestId('category-rows-primary');
    expect(primary).toHaveLength(1);
    expect(screen.getByTestId('category-rows-row-0')).toContainElement(primary[0]);
    expect(primary[0]).toHaveTextContent('Primary');
  });

  it('names each remove button by its position and draws the icons it was given', () => {
    mount({ defaults: [WATERCOLOUR, OILS] });

    expect(removeButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
      'Remove category 1',
      'Remove category 2',
    ]);
    expect(screen.getAllByTestId('icon-remove')).toHaveLength(2);
    expect(within(addButton()).getByTestId('icon-add')).toBeInTheDocument();
  });

  it('renders no row when the form holds no list, and the first add creates an empty one', async () => {
    const { form } = mount();

    expect(screen.queryByTestId('category-rows-row-0')).not.toBeInTheDocument();
    fireEvent.click(addButton());

    expect(await screen.findByTestId('category-rows-row-0')).toBeInTheDocument();
    expect(form().getValues('categories')).toEqual([EMPTY_CATEGORY]);
  });

  it('appends a row that does not share its object with the package constant', async () => {
    const { form } = mount({ defaults: [WATERCOLOUR] });

    fireEvent.click(addButton());
    await screen.findByTestId('category-rows-row-1');

    const added = form().getValues('categories.1');
    expect(added).toEqual(EMPTY_CATEGORY);
    expect(added).not.toBe(EMPTY_CATEGORY);
  });

  it('writes a pick into the right row of the form', async () => {
    const { form } = mount({ defaults: [WATERCOLOUR, { ...EMPTY_CATEGORY }] });

    fireEvent.mouseDown(combo(1, /^Super Category/));
    fireEvent.click(screen.getByRole('option', { name: 'Arts' }));

    await waitFor(() => expect(form().getValues('categories.1.super_id')).toBe('s1'));
    expect(form().getValues('categories.0')).toEqual(WATERCOLOUR);
  });

  it('tells the caller which row changed, after the form holds the new value', async () => {
    const seen: Array<{ index: number; superId: string; inForm: string }> = [];
    const formRef: { current: Form | null } = { current: null };
    render(
      <TestForm
        formRef={formRef}
        defaults={[WATERCOLOUR, { ...EMPTY_CATEGORY }]}
        onRowChange={(index, value) =>
          seen.push({ index, superId: value.super_id, inForm: formRef.current?.getValues('categories.1.super_id') ?? '' })
        }
      />,
    );

    fireEvent.mouseDown(combo(1, /^Super Category/));
    fireEvent.click(screen.getByRole('option', { name: 'Arts' }));

    await waitFor(() => expect(seen).toEqual([{ index: 1, superId: 's1', inForm: 's1' }]));
  });

  it('will not remove a row at the minimum, which is one by default', () => {
    mount({ defaults: [WATERCOLOUR] });
    expect(removeButtons()[0]).toBeDisabled();
  });

  it('honours a larger minimum', () => {
    mount({ defaults: [WATERCOLOUR, OILS], min: 2 });
    expect(removeButtons().every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  });

  it('removes the row whose button was pressed and hands focus to the add button', async () => {
    const { form } = mount({ defaults: [WATERCOLOUR, OILS] });

    fireEvent.click(removeButtons()[0]);

    await waitFor(() => expect(form().getValues('categories')).toEqual([OILS]));
    expect(combo(0, /^Sub Category/).value).toBe('Oils');
    await waitFor(() => expect(addButton()).toHaveFocus());
  });

  it('disables add at the maximum and says why', () => {
    mount({ defaults: [WATERCOLOUR, OILS], max: 2 });

    expect(addButton()).toBeDisabled();
    expect(screen.getByTestId('category-rows-max')).toHaveTextContent('That is the most categories allowed');
  });

  it('keeps add enabled, with no limit note, below the maximum', () => {
    mount({ defaults: [WATERCOLOUR], max: 2 });

    expect(addButton()).toBeEnabled();
    expect(screen.queryByTestId('category-rows-max')).not.toBeInTheDocument();
  });

  it('re-enables add once a row is removed from a full list', async () => {
    mount({ defaults: [WATERCOLOUR, OILS], max: 2 });

    fireEvent.click(removeButtons()[1]);

    await waitFor(() => expect(addButton()).toBeEnabled());
    await waitFor(() => expect(addButton()).toHaveFocus());
  });

  it('flags a later row repeating a sub category, and leaves the first to name it alone', () => {
    mount({ defaults: [WATERCOLOUR, OILS, WATERCOLOUR] });

    expect(within(screen.getByTestId('category-rows-row-2')).getByText('Already added above')).toBeInTheDocument();
    expect(combo(2, /^Sub Category/)).toHaveAttribute('aria-invalid', 'true');
    expect(within(screen.getByTestId('category-rows-row-0')).queryByText('Already added above')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('category-rows-row-1')).queryByText('Already added above')).not.toBeInTheDocument();
  });

  it('shows a row its own form error on the sub level', async () => {
    mount({
      defaults: [WATERCOLOUR, { ...EMPTY_CATEGORY }],
      onReady: (form) => form.setError('categories.1', { type: 'custom', message: 'Choose all three levels' }),
    });

    const second = screen.getByTestId('category-rows-row-1');
    expect(await within(second).findByText('Choose all three levels')).toBeInTheDocument();
    expect(within(screen.getByTestId('category-rows-row-0')).queryByText('Choose all three levels')).not.toBeInTheDocument();
  });

  it('announces an error about the whole list', async () => {
    mount({
      defaults: [WATERCOLOUR],
      onReady: (form) => form.setError('categories', { type: 'custom', message: 'Add at least one category' }),
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Add at least one category');
    expect(alert).toBe(screen.getByTestId('category-rows-error'));
  });

  it('shows no list error while the list is valid', () => {
    mount({ defaults: [WATERCOLOUR] });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the rows read-only when disabled: no add, no remove, every dropdown locked', () => {
    mount({ defaults: [WATERCOLOUR, OILS], disabled: true });

    expect(screen.queryByRole('button', { name: 'Add category' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove category/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('combobox').every((input) => (input as HTMLInputElement).disabled)).toBe(true);
    expect(combo(1, /^Sub Category/).value).toBe('Oils');
  });

  it('skips the optional words it was not given: no primary mark, no named group, no duplicate flag, no limit note', () => {
    mount({
      defaults: [WATERCOLOUR, WATERCOLOUR],
      max: 2,
      labels: { add: 'Add category', remove: () => 'Remove category' },
    });

    expect(screen.queryByTestId('category-rows-primary')).not.toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(combo(1, /^Sub Category/)).toHaveAttribute('aria-invalid', 'false');
    expect(addButton()).toBeDisabled();
    expect(screen.queryByTestId('category-rows-max')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remove category' })).toHaveLength(2);
  });

  it('wraps the rows in a titled fieldset when given a legend', () => {
    mount({ defaults: [WATERCOLOUR], legend: 'Venue categories', hint: 'Every category this venue hosts.' });

    const fieldset = screen.getByRole('group', { name: 'Venue categories' });
    expect(fieldset.tagName).toBe('FIELDSET');
    expect(fieldset).toContainElement(screen.getByTestId('category-rows'));
    expect(within(fieldset).getByText('Every category this venue hosts.')).toBeInTheDocument();
  });

  it('passes the picker props and per-level labels to every row, under a custom test id', () => {
    mount({
      defaults: [WATERCOLOUR, OILS],
      testId: 'venue-categories',
      required: true,
      levelLabels: { sub: 'Activity' },
    });

    const second = within(screen.getByTestId('venue-categories-row-1'));
    expect((second.getByRole('combobox', { name: /^Activity/ }) as HTMLInputElement).value).toBe('Oils');
    expect(second.getByRole('combobox', { name: /^Activity/ })).toBeRequired();
    expect(screen.getByTestId('venue-categories-add')).toBe(addButton());
    expect(screen.getByTestId('venue-categories-remove-1')).toBe(removeButtons()[1]);
  });

  it('draws the surface’s own buttons when given them', async () => {
    const SurfaceButton = ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
      <button type="button" data-surface="button" onClick={onClick}>
        {children}
      </button>
    );
    const SurfaceIconButton = ({ onClick, ...rest }: { onClick?: () => void; 'aria-label'?: string }) => (
      <button type="button" data-surface="icon-button" aria-label={rest['aria-label']} onClick={onClick} />
    );
    const { form } = mount({
      defaults: [WATERCOLOUR, OILS],
      components: {
        Button: SurfaceButton as unknown as NonNullable<RowsProps['components']>['Button'],
        IconButton: SurfaceIconButton as unknown as NonNullable<RowsProps['components']>['IconButton'],
      },
    });

    expect(addButton()).toHaveAttribute('data-surface', 'button');
    expect(removeButtons()[0]).toHaveAttribute('data-surface', 'icon-button');

    // This add button carries no id, so there is nothing to hand focus to: the removal still lands.
    fireEvent.click(removeButtons()[1]);
    await waitFor(() => expect(form().getValues('categories')).toEqual([WATERCOLOUR]));
    expect(addButton()).not.toHaveFocus();
  });

  it('falls back to the MUI icon button when only the add button is swapped', () => {
    const SurfaceButton = ({ children }: { children?: ReactNode }) => (
      <button type="button" data-surface="button">
        {children}
      </button>
    );
    mount({
      defaults: [WATERCOLOUR],
      components: { Button: SurfaceButton as unknown as NonNullable<RowsProps['components']>['Button'] },
    });

    expect(addButton()).toHaveAttribute('data-surface', 'button');
    expect(removeButtons()[0].className).toContain('MuiIconButton');
  });
});
