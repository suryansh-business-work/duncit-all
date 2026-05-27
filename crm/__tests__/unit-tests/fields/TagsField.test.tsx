import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Formik, Form } from 'formik';
import TagsField from '@/forms/fields/TagsField';

const renderField = (initial: string[]) =>
  render(
    <Formik initialValues={{ tags: initial }} onSubmit={() => undefined}>
      {() => (
        <Form>
          <TagsField name="tags" suggestions={['featured', 'priority']} />
        </Form>
      )}
    </Formik>
  );

describe('TagsField', () => {
  it('shows the existing tags as chips', () => {
    renderField(['premium', 'south-zone']);
    expect(screen.getByText('premium')).toBeInTheDocument();
    expect(screen.getByText('south-zone')).toBeInTheDocument();
  });

  it('accepts a typed value via the freeSolo path', () => {
    renderField([]);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'walk-in' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('walk-in')).toBeInTheDocument();
  });

  it('renders the empty placeholder when no tags', () => {
    renderField([]);
    expect(screen.getByPlaceholderText(/type and press enter/i)).toBeInTheDocument();
  });
});
