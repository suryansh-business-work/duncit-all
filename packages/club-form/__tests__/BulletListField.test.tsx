import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import BulletListField from '../src/components/BulletListField';
import type { ClubFormValues } from '../src/types';
import { FormHarness } from './formHarness';

describe('BulletListField', () => {
  it('renders helper text, existing points and the error message', () => {
    render(
      <FormHarness defaultValues={{ who_we_are: ['first', 'second'] }}>
        <BulletListField name="who_we_are" label="Who We Are" helperText="short lines" error="Add one point" />
      </FormHarness>,
    );
    expect(screen.getByText('short lines')).toBeInTheDocument();
    expect(screen.getByText('Add one point')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Point 1')).toHaveValue('first');
    expect(screen.getByPlaceholderText('Point 2')).toHaveValue('second');
  });

  it('renders without helper text or error when those props are omitted', () => {
    render(
      <FormHarness defaultValues={{ perks: [] }}>
        <BulletListField name="perks" label="Perks" />
      </FormHarness>,
    );
    expect(screen.getByText('Perks')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Point 1')).not.toBeInTheDocument();
  });

  it('coerces a nullish entry value to an empty string', () => {
    let methods: UseFormReturn<ClubFormValues> | undefined;
    render(
      <FormHarness defaultValues={{ perks: ['seed'] }} onMethods={(m) => { methods = m; }}>
        <BulletListField name="perks" label="Perks" />
      </FormHarness>,
    );
    act(() => methods?.setValue('perks.0', null as unknown as string));
    expect(screen.getByPlaceholderText('Point 1')).toHaveValue('');
  });

  it('adds a point, edits it and removes it', async () => {
    const user = userEvent.setup();
    let methods: UseFormReturn<ClubFormValues> | undefined;
    render(
      <FormHarness defaultValues={{ what_we_do: [] }} onMethods={(m) => { methods = m; }}>
        <BulletListField name="what_we_do" label="What We Do" />
      </FormHarness>,
    );

    await user.click(screen.getByRole('button', { name: 'Add point' }));
    const input = screen.getByPlaceholderText('Point 1');
    await user.type(input, 'we meet weekly');
    expect(methods?.getValues('what_we_do')).toEqual(['we meet weekly']);

    await user.click(screen.getByRole('button', { name: 'Remove point 1' }));
    expect(screen.queryByPlaceholderText('Point 1')).not.toBeInTheDocument();
    expect(methods?.getValues('what_we_do')).toEqual([]);
  });
});
