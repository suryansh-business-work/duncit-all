import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import TagsField from '@/forms/fields/TagsField';

function Harness({ initial }: Readonly<{ initial: string[] }>) {
  const methods = useForm({ defaultValues: { tags: initial } });
  return (
    <FormProvider {...methods}>
      <form>
        <TagsField name="tags" suggestions={['featured', 'priority']} />
      </form>
    </FormProvider>
  );
}

const renderField = (initial: string[]) => render(<Harness initial={initial} />);

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
