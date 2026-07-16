import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AdminCategoryValue, CategoryDoc } from '../src/types';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

const { RhfAdminCategory } = await import('../src/RhfAdminCategory');

const CATEGORIES: CategoryDoc[] = [
  { id: 's1', name: 'Arts', slug: 'arts', level: 'SUPER' },
  { id: 's2', name: 'Wellness', slug: 'wellness', level: 'SUPER' },
  { id: 'c1', name: 'Painting', slug: 'painting', level: 'CATEGORY', parent_id: 's1' },
];

const FULL_VALUE: AdminCategoryValue = {
  super_id: 's1',
  super_name: 'Arts',
  category_id: 'c1',
  category_name: 'Painting',
  sub_id: '',
  sub_name: '',
};

interface FormValues {
  category: AdminCategoryValue;
}

interface TestFormProps {
  defaultValue?: AdminCategoryValue;
  onSubmitSpy?: (value: AdminCategoryValue) => void;
  /** null => setError with no message (tests the "Required" fallback); a string => explicit message. */
  errorMessage?: string | null;
}

/** Hoisted so RhfAdminCategory is exercised through a real react-hook-form context (S6478). */
function TestForm({ defaultValue, onSubmitSpy, errorMessage }: Readonly<TestFormProps>) {
  const { control, setError, handleSubmit } = useForm<FormValues>({
    defaultValues: { category: defaultValue },
  });

  useEffect(() => {
    if (errorMessage === null) {
      setError('category', { type: 'manual' });
    } else if (errorMessage) {
      setError('category', { type: 'manual', message: errorMessage });
    }
  }, [errorMessage, setError]);

  const onSubmit = handleSubmit((values) => onSubmitSpy?.(values.category));

  return (
    <form onSubmit={onSubmit}>
      <RhfAdminCategory control={control} name="category" />
      <button type="submit">Submit</button>
    </form>
  );
}

function setCategories(categories: CategoryDoc[]) {
  useQueryMock.mockReturnValue({ data: { categories }, loading: false, error: undefined });
}

function openDropdown(combo: HTMLElement) {
  fireEvent.mouseDown(combo);
}

beforeEach(() => {
  useQueryMock.mockReset();
});

describe('RhfAdminCategory', () => {
  it('renders empty when the form field has no default value', () => {
    setCategories(CATEGORIES);
    render(<TestForm />);
    const superInput = screen.getByRole('combobox', { name: /Super Category/i }) as HTMLInputElement;
    expect(superInput.value).toBe('');
  });

  it('hydrates the picker from an existing form value', () => {
    setCategories(CATEGORIES);
    render(<TestForm defaultValue={FULL_VALUE} />);
    const superInput = screen.getByRole('combobox', { name: /Super Category/i }) as HTMLInputElement;
    expect(superInput.value).toBe('Arts');
  });

  it('wires a selection back into the form state on submit', async () => {
    setCategories(CATEGORIES);
    const onSubmitSpy = vi.fn();
    render(<TestForm onSubmitSpy={onSubmitSpy} />);

    openDropdown(screen.getByRole('combobox', { name: /Super Category/i }));
    fireEvent.click(screen.getByRole('option', { name: 'Wellness' }));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByDisplayValue('Wellness')).toBeInTheDocument();
    expect(onSubmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({ super_id: 's2', super_name: 'Wellness' }),
    );
  });

  it('maps a field error with a message onto the sub-level error text', async () => {
    setCategories(CATEGORIES);
    render(<TestForm errorMessage="Please choose a sub category" />);
    expect(await screen.findByText('Please choose a sub category')).toBeInTheDocument();
  });

  it('falls back to a generic "Required" message when the error has none', async () => {
    setCategories(CATEGORIES);
    render(<TestForm errorMessage={null} />);
    expect(await screen.findByText('Required')).toBeInTheDocument();
  });

  it('shows no error text when the field is valid', () => {
    setCategories(CATEGORIES);
    render(<TestForm />);
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });
});
