import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import AutoPodCategoryField from '../../src/AutoPodCategoryField';
import { Harness, makeConfig, makeData } from './helpers';
import type { PodFormValues } from '../../src/types';

// The cascade reads the admin category tree through useQuery.
const CATEGORIES = [
  { id: 'sup-sports', name: 'Sports', slug: 'sports', level: 'SUPER', parent_id: null },
  { id: 'cat-racket', name: 'Racket', slug: 'racket', level: 'CATEGORY', parent_id: 'sup-sports' },
  { id: 'sub-badminton', name: 'Badminton', slug: 'bad', level: 'SUB', parent_id: 'cat-racket' },
  // A second Super, so a test can actually MOVE the top level — re-selecting the
  // option already showing fires no change at all.
  { id: 'sup-arts', name: 'Arts', slug: 'arts', level: 'SUPER', parent_id: null },
];
vi.mock('@apollo/client', () => ({
  gql: (s: TemplateStringsArray) => s.join(''),
}));
vi.mock('@apollo/client/react', () => ({
  useQuery: () => ({ data: { categories: CATEGORIES }, loading: false, error: undefined }),
}));

function renderField(over: Parameters<typeof makeConfig>[0] = {}, defaults: Partial<PodFormValues> = {}) {
  const methodsRef: { current: UseFormReturn<PodFormValues> | null } = { current: null };
  render(
    <Harness
      data={makeData({ config: makeConfig({ autoPod: true, ...over }) })}
      defaultValues={defaults}
      methodsRef={methodsRef}
    >
      <AutoPodCategoryField />
    </Harness>,
  );
  return methodsRef;
}

/**
 * Pick one option out of a select that has just been opened.
 *
 * `findByRole`, because each level of the cascade rebuilds the NEXT select's
 * options: the menu that opens after choosing Sports is a render behind the click
 * that opened it. Reading it synchronously passes only when that render lands in
 * the same tick — the race that took PodCategoryFilter red on CI while it stayed
 * green locally.
 */
async function pick(user: ReturnType<typeof userEvent.setup>, label: RegExp, option: string) {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('AutoPodCategoryField', () => {
  it('writes a fully picked Super → Sub pair into the form', async () => {
    const user = userEvent.setup({ delay: null });
    const ref = renderField();
    await pick(user, /Super Category/, 'Sports');
    await pick(user, /^Category/, 'Racket');
    await pick(user, /Sub Category/, 'Badminton');
    expect(ref.current?.getValues('super_category_id')).toBe('sup-sports');
    expect(ref.current?.getValues('sub_category_id')).toBe('sub-badminton');
  });

  it('clears the Sub without complaint when a new Super is picked', async () => {
    const user = userEvent.setup({ delay: null });
    const ref = renderField({}, { super_category_id: 'sup-sports', sub_category_id: 'sub-badminton' });
    act(() => {
      ref.current?.setError('sub_category_id', { type: 'custom', message: 'Select a category' });
    });
    expect(screen.getByText('Select a category')).toBeInTheDocument();
    // Moving the Super empties the Sub; only a chosen Sub (or a submit) validates.
    await pick(user, /Super Category/, 'Arts');
    expect(ref.current?.getValues('sub_category_id')).toBe('');
    expect(screen.queryByText('Select a category')).not.toBeInTheDocument();
  });

  it('hydrates the three levels from the stored id pair', () => {
    renderField({}, { super_category_id: 'sup-sports', sub_category_id: 'sub-badminton' });
    expect(screen.getByLabelText(/Super Category/)).toHaveValue('Sports');
    expect(screen.getByLabelText(/^Category/)).toHaveValue('Racket');
    expect(screen.getByLabelText(/Sub Category/)).toHaveValue('Badminton');
    expect(screen.getByText(/Hosts approved in this sub-category/)).toBeInTheDocument();
  });

  it('locks the picker and explains why when the category is fixed', () => {
    renderField({ lockCategory: true }, { super_category_id: 'sup-sports', sub_category_id: 'sub-badminton' });
    expect(screen.getByLabelText(/Super Category/)).toBeDisabled();
    expect(screen.getByLabelText(/Sub Category/)).toBeDisabled();
    expect(screen.getByText(/Locked — a host or club has already enrolled/)).toBeInTheDocument();
  });

  it('shows the sub-category validation error under its field', () => {
    const ref = renderField();
    act(() => {
      ref.current?.setError('sub_category_id', { type: 'custom', message: 'Select a category' });
    });
    expect(screen.getByText('Select a category')).toBeInTheDocument();
  });
});
