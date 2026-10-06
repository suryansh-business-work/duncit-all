import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import SuperCategoryField from '@/forms/fields/SuperCategoryField';
import { SUPER_CATEGORIES } from '@/api/crm.gql';

const superCategoriesMock = {
  request: { query: SUPER_CATEGORIES },
  result: {
    data: {
      categories: [
        { __typename: 'Category', id: 'cat-sports', name: 'Sports', slug: 'sports', icon: '', is_active: true, sort_order: 0 },
        { __typename: 'Category', id: 'cat-music', name: 'Music', slug: 'music', icon: '', is_active: true, sort_order: 1 },
        { __typename: 'Category', id: 'cat-archived', name: 'Archived', slug: 'archived', icon: '', is_active: false, sort_order: 99 },
      ],
    },
  },
};

function ValueProbe() {
  const value = useWatch({ name: 'super_category_id' }) as string | undefined;
  return <output data-testid="value">{JSON.stringify(value ?? null)}</output>;
}

function Harness({ unset = false, error }: Readonly<{ unset?: boolean; error?: string }>) {
  const methods = useForm<{ super_category_id?: string }>({ defaultValues: unset ? {} : { super_category_id: '' } });
  useEffect(() => {
    if (error) methods.setError('super_category_id', { message: error });
  }, [error, methods]);
  return (
    <FormProvider {...methods}>
      <form>
        <SuperCategoryField name="super_category_id" />
        <ValueProbe />
      </form>
    </FormProvider>
  );
}

function renderField(mocks = [superCategoriesMock], unset = false, error?: string) {
  return render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
      <Harness unset={unset} error={error} />
    </MockedProvider>
  );
}

describe('SuperCategoryField', () => {
  it('renders the loading skeleton while the query is in flight', () => {
    const { container } = renderField();
    expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
  });

  it('renders the field with the supplied label once data resolves', async () => {
    renderField();
    await waitFor(() => {
      expect(screen.getByLabelText(/super category/i)).toBeInTheDocument();
    });
  });

  it('shows the "no categories" hint when the catalogue is empty', async () => {
    const emptyMock = { ...superCategoriesMock, result: { data: { categories: [] } } };
    renderField([emptyMock]);
    await waitFor(() => {
      expect(screen.getByText(/no super categories yet/i)).toBeInTheDocument();
    });
  });

  it('renders an unset value as None and writes the picked super category id', async () => {
    renderField([superCategoriesMock], true);
    const combo = await screen.findByRole('combobox', { name: /super category/i });
    expect(screen.getByTestId('value')).toHaveTextContent('null');

    fireEvent.mouseDown(combo);
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getByRole('option', { name: 'None' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(listbox).getByRole('option', { name: 'Music' }));

    expect(screen.getByTestId('value')).toHaveTextContent('"cat-music"');
    expect(screen.getByRole('combobox', { name: /super category/i })).toHaveTextContent('Music');
  });

  it('shows the validation error instead of the hint', async () => {
    renderField([superCategoriesMock], false, 'Pick a super category');
    expect(await screen.findByText('Pick a super category')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /super category/i })).toHaveAttribute('aria-invalid', 'true');
  });
});
