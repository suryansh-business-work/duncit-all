import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { Formik, Form } from 'formik';
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

function renderField(mocks = [superCategoriesMock]) {
  return render(
    <MockedProvider mocks={mocks}>
      <Formik initialValues={{ super_category_id: '' }} onSubmit={() => undefined}>
        {() => (
          <Form>
            <SuperCategoryField name="super_category_id" />
          </Form>
        )}
      </Formik>
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
});
