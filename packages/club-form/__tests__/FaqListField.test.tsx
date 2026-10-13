import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseFormReturn } from 'react-hook-form';
import FaqListField from '../src/components/FaqListField';
import type { ClubFormValues } from '../src/types';
import { FormHarness } from './formHarness';

describe('FaqListField', () => {
  it('renders existing FAQ pairs', () => {
    render(
      <FormHarness defaultValues={{ faqs: [{ question: 'When?', answer: 'Sundays' }] }}>
        <FaqListField />
      </FormHarness>,
    );
    expect(screen.getByLabelText('Question 1')).toHaveValue('When?');
    expect(screen.getByLabelText('Answer')).toHaveValue('Sundays');
  });

  it('coerces nullish question/answer values to empty strings', () => {
    let methods: UseFormReturn<ClubFormValues> | undefined;
    render(
      <FormHarness defaultValues={{ faqs: [{ question: 'q', answer: 'a' }] }} onMethods={(m) => { methods = m; }}>
        <FaqListField />
      </FormHarness>,
    );
    act(() => {
      methods?.setValue('faqs.0.question', null as unknown as string);
      methods?.setValue('faqs.0.answer', null as unknown as string);
    });
    expect(screen.getByLabelText('Question 1')).toHaveValue('');
    expect(screen.getByLabelText('Answer')).toHaveValue('');
  });

  it('announces the list-level error a half-filled FAQ raises, and nothing while the list is valid', () => {
    let methods: UseFormReturn<ClubFormValues> | undefined;
    render(
      <FormHarness defaultValues={{ faqs: [{ question: 'When?', answer: '' }] }} onMethods={(m) => { methods = m; }}>
        <FaqListField />
      </FormHarness>,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // The schema reports a half-filled pair on the list itself, not on a row.
    act(() => {
      methods?.setError('faqs', { type: 'custom', message: 'Each FAQ needs both a question and an answer' });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Each FAQ needs both a question and an answer');

    act(() => {
      methods?.clearErrors('faqs');
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('adds, edits and removes a FAQ pair', async () => {
    const user = userEvent.setup();
    let methods: UseFormReturn<ClubFormValues> | undefined;
    render(
      <FormHarness defaultValues={{ faqs: [] }} onMethods={(m) => { methods = m; }}>
        <FaqListField />
      </FormHarness>,
    );

    await user.click(screen.getByRole('button', { name: 'Add FAQ' }));
    await user.type(screen.getByLabelText('Question 1'), 'Q?');
    await user.type(screen.getByLabelText('Answer'), 'A!');
    expect(methods?.getValues('faqs')).toEqual([{ question: 'Q?', answer: 'A!' }]);

    await user.click(screen.getByRole('button', { name: 'Remove FAQ 1' }));
    expect(screen.queryByLabelText('Question 1')).not.toBeInTheDocument();
    expect(methods?.getValues('faqs')).toEqual([]);
  });
});
