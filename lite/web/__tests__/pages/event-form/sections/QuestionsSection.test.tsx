import { useFormContext } from 'react-hook-form';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventFormValues } from '../../../../pages/event-form/event.types';
import { QuestionsSection } from '../../../../pages/event-form/sections/QuestionsSection';
import { renderInEventForm } from '../helpers';

function Questions() {
  const { control } = useFormContext<EventFormValues>();
  return <QuestionsSection control={control} />;
}

describe('QuestionsSection', () => {
  it('says there are no questions yet', () => {
    renderInEventForm(<Questions />);
    expect(screen.getByText('No questions yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('adds a short-text question, with no options box', async () => {
    const { user, form } = renderInEventForm(<Questions />);
    await user.click(screen.getByRole('button', { name: 'Add question' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Question' })).toHaveValue('');
    expect(screen.queryByRole('textbox', { name: 'Options' })).not.toBeInTheDocument();
    expect(form().getValues('questions')).toEqual([{ id: '', label: '', type: 'TEXT', required: false, options: '' }]);
  });

  it('shows the options box once the answer type is “Pick one”', async () => {
    const { user, form } = renderInEventForm(<Questions />);
    await user.click(screen.getByRole('button', { name: 'Add question' }));
    await user.type(screen.getByRole('textbox', { name: 'Question' }), 'T-shirt size');
    await user.click(screen.getByTestId('question-type-0'));
    for (const name of ['Short text', 'Long text', 'Yes / no', 'Pick one']) expect(screen.getByRole('option', { name })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Pick one' }));

    const options = await screen.findByRole('textbox', { name: 'Options' });
    await user.type(options, 'S{Enter}M');
    expect(form().getValues('questions.0')).toMatchObject({ label: 'T-shirt size', type: 'SELECT', options: 'S\nM' });
  });

  it('marks a question required', async () => {
    const { user, form } = renderInEventForm(<Questions />);
    await user.click(screen.getByRole('button', { name: 'Add question' }));
    await user.click(screen.getByRole('checkbox', { name: 'Required' }));
    expect(form().getValues('questions.0.required')).toBe(true);
  });

  it('removes a question', async () => {
    const { user, form } = renderInEventForm(<Questions />, { defaults: { questions: [{ id: 'q-1', label: 'Dietary needs', type: 'TEXT', required: false, options: '' }] } });
    expect(screen.getByRole('textbox', { name: 'Question' })).toHaveValue('Dietary needs');
    await user.click(screen.getByRole('button', { name: 'Remove question' }));
    expect(form().getValues('questions')).toEqual([]);
    expect(screen.getByText('No questions yet.')).toBeInTheDocument();
  });
});
