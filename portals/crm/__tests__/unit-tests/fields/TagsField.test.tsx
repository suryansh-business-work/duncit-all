import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import TagsField from '@/forms/fields/TagsField';

/** Prints the form's stored `tags` value so tests assert what is saved, not just what renders. */
function TagsValue() {
  const tags = useWatch({ name: 'tags' });
  return <output data-testid="tags-value">{JSON.stringify(tags ?? null)}</output>;
}

function Harness({ initial }: Readonly<{ initial?: string[] }>) {
  const methods = useForm<{ tags?: string[] }>({ defaultValues: initial ? { tags: initial } : {} });
  return (
    <FormProvider {...methods}>
      <form>
        <TagsField name="tags" suggestions={['featured', 'priority']} />
        <TagsValue />
      </form>
    </FormProvider>
  );
}

const renderField = (initial: string[]) => render(<Harness initial={initial} />);

const addTag = (value: string) => {
  const input = screen.getByRole('combobox');
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

const readTags = () => JSON.parse(screen.getByTestId('tags-value').textContent ?? 'null');

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

  it('treats a field with no value yet as an empty tag list', () => {
    render(<Harness />);
    expect(screen.getByPlaceholderText(/type and press enter/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /walk-in/ })).toBeNull();

    addTag('walk-in');

    expect(readTags()).toEqual(['walk-in']);
    expect(screen.getByPlaceholderText(/add another/i)).toBeInTheDocument();
  });

  it('drops a blank token instead of storing it', () => {
    renderField(['premium']);

    addTag('   ');

    expect(readTags()).toEqual(['premium']);
  });

  it('ignores a case-insensitive duplicate of an existing tag', () => {
    renderField(['Premium']);

    addTag('premium');

    expect(readTags()).toEqual(['Premium']);
  });

  it('trims new tags and drops non-string entries left over in the stored value', () => {
    renderField([null as unknown as string, 'premium']);

    addTag('  south-zone  ');

    expect(readTags()).toEqual(['premium', 'south-zone']);
  });
});
